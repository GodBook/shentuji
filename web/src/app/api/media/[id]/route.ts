import path from "node:path";
import { createReadStream, promises as fs } from "node:fs";
import { Readable } from "node:stream";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { errorResponse, HttpError } from "@/lib/http";
import { getStoredImage } from "@/lib/library";
import { getDataPaths } from "@/lib/paths";

type Context = { params: Promise<{ id: string }> };

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, context: Context) {
  try {
    requireAuth(request);
    const id = z.string().uuid().parse((await context.params).id);
    const image = getStoredImage(id);
    if (!image) throw new HttpError(404, "图片不存在");
    const url = new URL(request.url);
    const thumbnail = url.searchParams.get("variant") === "thumbnail";
    const paths = getDataPaths();
    const filePath = thumbnail
      ? path.join(paths.thumbnails, image.thumbnailName)
      : path.join(paths.originals, image.storageName);
    const stat = await fs.stat(filePath).catch(() => null);
    if (!stat) throw new HttpError(404, "图片文件不存在");
    const fallbackName = `image.${image.extension}`;
    const disposition = url.searchParams.get("download") === "1"
      ? `attachment; filename="${fallbackName}"; filename*=UTF-8''${encodeURIComponent(image.originalName)}`
      : "inline";
    const body = Readable.toWeb(createReadStream(filePath));

    return new Response(body as ReadableStream, {
      headers: {
        "Content-Type": thumbnail ? "image/webp" : image.mimeType,
        "Content-Length": String(stat.size),
        "Content-Disposition": disposition,
        "Cache-Control": thumbnail
          ? "private, max-age=86400, immutable"
          : "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
