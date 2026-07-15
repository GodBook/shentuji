import path from "node:path";
import os from "node:os";
import { mkdtemp, rm } from "node:fs/promises";
import type { PassThrough } from "node:stream";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createBackupArchive, importBackupArchive } from "@/lib/archive";
import { openDatabase } from "@/lib/db";
import { deleteStoredImage, storeImageBuffer } from "@/lib/image-store";
import { createGroup, deleteGroup, listImages, restoreImages, trashImages, updateImage } from "@/lib/library";
import { findSimilarImages } from "@/lib/similarity";

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nHsAAAAASUVORK5CYII=",
  "base64",
);

async function streamBuffer(stream: PassThrough) {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

describe.sequential("library integration", () => {
  let root = "";

  beforeAll(async () => {
    root = await mkdtemp(path.join(os.tmpdir(), "shentuji-test-"));
    process.env.DATA_DIR = root;
    global.__shentujiDb = openDatabase(path.join(root, "library.sqlite"));
  });

  afterAll(async () => {
    global.__shentujiDb?.close();
    global.__shentujiDb = undefined;
    await rm(root, { recursive: true, force: true });
  });

  it("stores duplicate files as independent records and applies AND keyword search", async () => {
    const group = createGroup("聊天表情");
    await storeImageBuffer({ buffer: PNG, originalName: "one.png", keywords: ["猫猫", "震惊"], groupId: group.id });
    await storeImageBuffer({ buffer: PNG, originalName: "two.png", keywords: ["猫猫"], groupId: group.id });

    expect(listImages().total).toBe(2);
    expect(listImages({ keywords: ["猫猫", "震惊"] }).items.map((item) => item.originalName)).toEqual(["one.png"]);
  });

  it("moves images to ungrouped when a group is deleted", () => {
    const group = createGroup("临时分组");
    const image = listImages().items[0];
    global.__shentujiDb!.prepare("UPDATE images SET group_id = ? WHERE id = ?").run(group.id, image.id);
    deleteGroup(group.id);
    expect(listImages({ groupId: null }).items.some((item) => item.id === image.id)).toBe(true);
  });

  it("supports favorites, ratings, recycle bin restore and local similarity detection", async () => {
    const image = listImages().items.find((item) => item.originalName === "one.png")!;
    const updated = updateImage(image.id, { favorite: true, rating: 5 });
    expect(updated.favorite).toBe(true);
    expect(updated.rating).toBe(5);
    expect(listImages({ favorite: true, minRating: 5 }).items.map((item) => item.id)).toContain(image.id);

    const similar = await findSimilarImages(image.id);
    expect(similar.matches.some((match) => match.image.originalName === "two.png" && match.distance === 0)).toBe(true);

    expect(trashImages([image.id])).toBe(1);
    expect(listImages().items.some((item) => item.id === image.id)).toBe(false);
    const trashed = listImages({ trash: "only" }).items.find((item) => item.id === image.id);
    expect(trashed?.deletedAt).toBeTruthy();
    expect(trashed?.favorite).toBe(true);
    expect(restoreImages([image.id])).toBe(1);
    expect(listImages().items.find((item) => item.id === image.id)?.rating).toBe(5);
  });

  it("permanently removes only images already in the recycle bin", async () => {
    const image = await storeImageBuffer({ buffer: PNG, originalName: "doomed.png" });
    await expect(deleteStoredImage(image.id)).rejects.toThrow("请先将图片移入回收站");
    trashImages([image.id]);
    await deleteStoredImage(image.id);
    expect(listImages({ trash: "only" }).items.some((item) => item.id === image.id)).toBe(false);
  });

  it("round-trips originals and metadata through a versioned backup", async () => {
    const before = listImages().total;
    const archive = await streamBuffer(createBackupArchive());
    const report = await importBackupArchive(archive);
    expect(report.skipped).toBe(0);
    expect(report.imported).toBe(before);
    expect(listImages().total).toBe(before * 2);
    expect(listImages().items.filter((item) => item.originalName === "one.png").every((item) => item.favorite && item.rating === 5)).toBe(true);
  });
});
