import crypto from "node:crypto";
import path from "node:path";
import { promises as fs } from "node:fs";
import { fileTypeFromBuffer } from "file-type";
import sharp from "sharp";
import { HttpError } from "@/lib/http";
import {
  getStoredImage,
  insertImage,
  removeImageDatabaseRecord,
  type InsertImageInput,
} from "@/lib/library";
import { getDataPaths, MAX_IMAGE_BYTES } from "@/lib/paths";
import { computePerceptualHash } from "@/lib/similarity";

const ALLOWED_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
} as const;

type AllowedMime = keyof typeof ALLOWED_TYPES;

export function isSafeArchivePath(value: string) {
  return (
    /^images\/[A-Za-z0-9_-]+\.(?:jpg|jpeg|png|webp|gif)$/.test(value) &&
    !value.includes("..") &&
    !value.includes("\\")
  );
}

export async function inspectImage(buffer: Buffer) {
  if (!buffer.byteLength) throw new HttpError(400, "图片文件为空");
  if (buffer.byteLength > MAX_IMAGE_BYTES) {
    throw new HttpError(413, `单张图片不能超过 ${Math.round(MAX_IMAGE_BYTES / 1024 / 1024)}MB`);
  }
  const detected = await fileTypeFromBuffer(buffer);
  if (!detected || !(detected.mime in ALLOWED_TYPES)) {
    throw new HttpError(415, "仅支持 JPEG、PNG、WebP 和 GIF 图片");
  }
  const mimeType = detected.mime as AllowedMime;

  let metadata: sharp.Metadata;
  try {
    metadata = await sharp(buffer, { animated: false, limitInputPixels: 120_000_000, failOn: 'none' }).metadata();
  } catch {
    throw new HttpError(415, "图片内容已损坏或无法解析");
  }
  if (!metadata.width || !metadata.height) throw new HttpError(415, "无法读取图片尺寸");
  const rotated = metadata.orientation && metadata.orientation >= 5 && metadata.orientation <= 8;
  return {
    mimeType,
    extension: ALLOWED_TYPES[mimeType],
    width: rotated ? metadata.height : metadata.width,
    height: rotated ? metadata.width : metadata.height,
  };
}

function safeOriginalName(value: string, extension: string) {
  const name = path.basename(value).replace(/[\u0000-\u001f]/g, "").trim();
  return (name || `image.${extension}`).slice(0, 255);
}

export async function storeImageBuffer(input: {
  buffer: Buffer;
  originalName: string;
  keywords?: string[];
  groupId?: string | null;
  createdAt?: string;
  favorite?: boolean;
  rating?: number;
}) {
  const details = await inspectImage(input.buffer);
  const perceptualHash = await computePerceptualHash(input.buffer);
  const paths = getDataPaths();
  const id = crypto.randomUUID();
  const storageName = `${id}.${details.extension}`;
  const thumbnailName = `${id}.webp`;
  const tempOriginal = path.join(paths.temporary, `${storageName}.uploading`);
  const tempThumbnail = path.join(paths.temporary, `${thumbnailName}.uploading`);
  const finalOriginal = path.join(paths.originals, storageName);
  const finalThumbnail = path.join(paths.thumbnails, thumbnailName);
  const createdAt =
    input.createdAt && !Number.isNaN(Date.parse(input.createdAt))
      ? new Date(input.createdAt).toISOString()
      : new Date().toISOString();

  try {
    await fs.writeFile(tempOriginal, input.buffer, { mode: 0o600 });
    await sharp(input.buffer, { animated: false, pages: 1, limitInputPixels: 120_000_000, failOn: 'none' })
      .rotate()
      .resize({ width: 720, withoutEnlargement: true })
      .webp({ quality: 82, effort: 4 })
      .toFile(tempThumbnail);
    await fs.rename(tempOriginal, finalOriginal);
    await fs.rename(tempThumbnail, finalThumbnail);

    const record: InsertImageInput = {
      id,
      storageName,
      thumbnailName,
      originalName: safeOriginalName(input.originalName, details.extension),
      mimeType: details.mimeType,
      extension: details.extension,
      byteSize: input.buffer.byteLength,
      width: details.width,
      height: details.height,
      createdAt,
      groupId: input.groupId ?? null,
      keywords: input.keywords ?? [],
      favorite: input.favorite,
      rating: input.rating,
      perceptualHash,
    };
    return insertImage(record);
  } catch (error) {
    await Promise.allSettled([
      fs.unlink(tempOriginal),
      fs.unlink(tempThumbnail),
      fs.unlink(finalOriginal),
      fs.unlink(finalThumbnail),
    ]);
    throw error;
  }
}

export async function deleteStoredImage(id: string) {
  const image = getStoredImage(id);
  if (!image) throw new HttpError(404, "图片不存在");
  if (!image.deletedAt) throw new HttpError(409, "请先将图片移入回收站");
  const paths = getDataPaths();
  const original = path.join(paths.originals, image.storageName);
  const thumbnail = path.join(paths.thumbnails, image.thumbnailName);
  const trashOriginal = path.join(paths.temporary, `${image.storageName}.deleting`);
  const trashThumbnail = path.join(paths.temporary, `${image.thumbnailName}.deleting`);
  let movedOriginal = false;
  let movedThumbnail = false;

  try {
    await fs.rename(original, trashOriginal);
    movedOriginal = true;
    await fs.rename(thumbnail, trashThumbnail);
    movedThumbnail = true;
    removeImageDatabaseRecord(id);
  } catch (error) {
    if (movedOriginal) await fs.rename(trashOriginal, original).catch(() => undefined);
    if (movedThumbnail) await fs.rename(trashThumbnail, thumbnail).catch(() => undefined);
    throw error;
  }

  await Promise.allSettled([fs.unlink(trashOriginal), fs.unlink(trashThumbnail)]);
}

export async function deleteStoredImages(ids: string[]) {
  const errors: Array<{ id: string; reason: string }> = [];
  let deleted = 0;
  for (const id of ids) {
    try {
      await deleteStoredImage(id);
      deleted += 1;
    } catch (error) {
      errors.push({ id, reason: error instanceof Error ? error.message : "删除失败" });
    }
  }
  return { deleted, errors };
}
