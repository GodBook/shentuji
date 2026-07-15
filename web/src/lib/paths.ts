import fs from "node:fs";
import path from "node:path";

const configuredMaxMb = Number(process.env.MAX_IMAGE_MB ?? 50);
export const MAX_IMAGE_BYTES =
  (Number.isFinite(configuredMaxMb) && configuredMaxMb > 0 ? configuredMaxMb : 50) *
  1024 *
  1024;

export function getDataPaths() {
  const root = path.resolve(
    process.env.DATA_DIR || path.join(process.cwd(), "..", "shentuji-data"),
  );
  const paths = {
    root,
    database: path.join(root, "library.sqlite"),
    originals: path.join(root, "originals"),
    thumbnails: path.join(root, "thumbnails"),
    temporary: path.join(root, "tmp"),
  };

  for (const directory of [
    paths.root,
    paths.originals,
    paths.thumbnails,
    paths.temporary,
  ]) {
    fs.mkdirSync(directory, { recursive: true });
  }

  return paths;
}
