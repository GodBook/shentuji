import path from "node:path";
import { promises as fs } from "node:fs";
import sharp from "sharp";
import { HttpError } from "@/lib/http";
import {
  getImagesByIds,
  getStoredImage,
  listHashedImages,
  listStoredImagesWithoutHash,
  setImagePerceptualHash,
} from "@/lib/library";
import { getDataPaths } from "@/lib/paths";
import type { SimilarImageMatch } from "@/lib/types";

export async function computePerceptualHash(buffer: Buffer) {
  const pixels = await sharp(buffer, {
    animated: false,
    pages: 1,
    limitInputPixels: 120_000_000,
    failOn: "none",
  })
    .rotate()
    .resize(9, 8, { fit: "fill" })
    .greyscale()
    .raw()
    .toBuffer();

  if (pixels.length !== 72) throw new HttpError(415, "无法生成图片特征");
  let hash = 0n;
  for (let y = 0; y < 8; y += 1) {
    for (let x = 0; x < 8; x += 1) {
      hash <<= 1n;
      if (pixels[y * 9 + x] > pixels[y * 9 + x + 1]) hash |= 1n;
    }
  }
  return hash.toString(16).padStart(16, "0");
}

export function hammingDistance(left: string, right: string) {
  if (!/^[0-9a-f]{16}$/i.test(left) || !/^[0-9a-f]{16}$/i.test(right)) {
    throw new Error("感知哈希格式无效");
  }
  let value = BigInt(`0x${left}`) ^ BigInt(`0x${right}`);
  let distance = 0;
  while (value) {
    distance += Number(value & 1n);
    value >>= 1n;
  }
  return distance;
}

export async function indexMissingPerceptualHashes() {
  const paths = getDataPaths();
  let indexed = 0;
  const errors: Array<{ id: string; reason: string }> = [];
  for (const image of listStoredImagesWithoutHash()) {
    try {
      const buffer = await fs.readFile(path.join(paths.originals, image.storageName));
      setImagePerceptualHash(image.id, await computePerceptualHash(buffer));
      indexed += 1;
    } catch (error) {
      errors.push({
        id: image.id,
        reason: error instanceof Error ? error.message : "无法生成图片特征",
      });
    }
  }
  return { indexed, errors };
}

export async function findSimilarImages(id: string, maxDistance = 12): Promise<{
  indexed: number;
  matches: SimilarImageMatch[];
}> {
  const image = getImagesByIds([id])[0];
  if (!image) throw new HttpError(404, "图片不存在或已在回收站");
  const indexing = await indexMissingPerceptualHashes();
  const target = getStoredImage(id);
  if (!target?.perceptualHash) throw new HttpError(422, "无法生成当前图片的特征");

  const distances = listHashedImages()
    .filter((candidate) => candidate.id !== id)
    .map((candidate) => ({
      id: candidate.id,
      distance: hammingDistance(target.perceptualHash!, candidate.perceptualHash),
    }))
    .filter((candidate) => candidate.distance <= Math.min(32, Math.max(0, maxDistance)))
    .sort((left, right) => left.distance - right.distance || left.id.localeCompare(right.id));
  const byId = new Map(getImagesByIds(distances.map((item) => item.id)).map((item) => [item.id, item]));
  return {
    indexed: indexing.indexed,
    matches: distances.flatMap((item) => {
      const match = byId.get(item.id);
      return match
        ? [{ image: match, distance: item.distance, similarity: Math.round((1 - item.distance / 64) * 100) }]
        : [];
    }),
  };
}
