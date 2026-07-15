import path from "node:path";
import { PassThrough } from "node:stream";
import archiver from "archiver";
import JSZip from "jszip";
import { z } from "zod";
import { HttpError } from "@/lib/http";
import { inspectImage, isSafeArchivePath, storeImageBuffer } from "@/lib/image-store";
import {
  getImagesByIds,
  getOrCreateGroup,
  getStoredImage,
  listGroups,
} from "@/lib/library";
import { getDataPaths } from "@/lib/paths";
import type { ImportReport } from "@/lib/types";

const dateString = z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
  message: "日期格式无效",
});

export const backupManifestSchema = z.object({
  schemaVersion: z.literal(1),
  exportedAt: dateString,
  groups: z.array(z.object({ name: z.string().trim().min(1).max(40) })).max(10_000),
  images: z
    .array(
      z.object({
        file: z.string().refine(isSafeArchivePath, "图片路径不安全"),
        originalName: z.string().min(1).max(255),
        mimeType: z.enum(["image/jpeg", "image/png", "image/webp", "image/gif"]),
        byteSize: z.number().int().positive(),
        width: z.number().int().positive(),
        height: z.number().int().positive(),
        createdAt: dateString,
        keywords: z.array(z.string().max(64)).max(30),
        groupName: z.string().trim().min(1).max(40).nullable(),
      }),
    )
    .max(10_000),
});

export type BackupManifest = z.infer<typeof backupManifestSchema>;

export function createBackupArchive(ids?: string[]) {
  const paths = getDataPaths();
  const images = getImagesByIds(ids);
  const manifest: BackupManifest = {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    groups: (ids
      ? Array.from(
          new Set(images.map((image) => image.group?.name).filter((name): name is string => Boolean(name))),
        ).map((name) => ({ name }))
      : listGroups().map((group) => ({ name: group.name }))),
    images: [],
  };

  const archive = archiver("zip", { zlib: { level: 6 } });
  const output = new PassThrough();
  archive.on("error", (error) => output.destroy(error));
  archive.pipe(output);

  for (const image of images) {
    const stored = getStoredImage(image.id);
    if (!stored) continue;
    const archivePath = `images/${image.id}.${stored.extension}`;
    manifest.images.push({
      file: archivePath,
      originalName: image.originalName,
      mimeType: image.mimeType,
      byteSize: image.byteSize,
      width: image.width,
      height: image.height,
      createdAt: image.createdAt,
      keywords: image.keywords,
      groupName: image.group?.name ?? null,
    });
    archive.file(path.join(paths.originals, stored.storageName), {
      name: archivePath,
      store: true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
  }

  archive.append(JSON.stringify(manifest, null, 2), { name: "manifest.json" });
  void archive.finalize();
  return output;
}

export async function importBackupArchive(buffer: Buffer): Promise<ImportReport> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(buffer, { checkCRC32: true });
  } catch {
    throw new HttpError(400, "ZIP 文件已损坏或无法读取");
  }
  const manifestEntry = zip.file("manifest.json");
  if (!manifestEntry) throw new HttpError(400, "备份中缺少 manifest.json");

  let manifest: BackupManifest;
  try {
    manifest = backupManifestSchema.parse(
      JSON.parse(await manifestEntry.async("string")) as unknown,
    );
  } catch (error) {
    throw new HttpError(400, "备份清单格式无效", {
      reason: error instanceof Error ? error.message : "无法解析清单",
    });
  }

  const groupsBefore = new Set(listGroups().map((group) => group.id));
  const groupIds = new Map<string, string>();
  for (const group of manifest.groups) {
    groupIds.set(group.name.toLocaleLowerCase("en-US"), getOrCreateGroup(group.name));
  }

  const report: ImportReport = {
    imported: 0,
    skipped: 0,
    groupsCreated: listGroups().filter((group) => !groupsBefore.has(group.id)).length,
    errors: [],
  };

  for (const item of manifest.images) {
    try {
      const file = zip.file(item.file);
      if (!file) throw new Error("备份中缺少该图片文件");
      const imageBuffer = await file.async("nodebuffer");
      if (imageBuffer.byteLength !== item.byteSize) throw new Error("文件大小与清单不一致");
      const details = await inspectImage(imageBuffer);
      if (details.mimeType !== item.mimeType) throw new Error("图片格式与清单不一致");
      if (details.width !== item.width || details.height !== item.height) {
        throw new Error("图片尺寸与清单不一致");
      }
      const groupId = item.groupName
        ? groupIds.get(item.groupName.toLocaleLowerCase("en-US")) ??
          getOrCreateGroup(item.groupName)
        : null;
      await storeImageBuffer({
        buffer: imageBuffer,
        originalName: item.originalName,
        keywords: item.keywords,
        groupId,
        createdAt: item.createdAt,
      });
      report.imported += 1;
    } catch (error) {
      report.skipped += 1;
      report.errors.push({
        file: item.file,
        reason: error instanceof Error ? error.message : "导入失败",
      });
    }
  }

  return report;
}
