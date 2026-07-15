import path from "node:path";
import os from "node:os";
import { mkdtemp, rm } from "node:fs/promises";
import type { PassThrough } from "node:stream";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createBackupArchive, importBackupArchive } from "@/lib/archive";
import { openDatabase } from "@/lib/db";
import { storeImageBuffer } from "@/lib/image-store";
import { createGroup, deleteGroup, listImages } from "@/lib/library";

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

  it("round-trips originals and metadata through a versioned backup", async () => {
    const before = listImages().total;
    const archive = await streamBuffer(createBackupArchive());
    const report = await importBackupArchive(archive);
    expect(report.skipped).toBe(0);
    expect(report.imported).toBe(before);
    expect(listImages().total).toBe(before * 2);
  });
});
