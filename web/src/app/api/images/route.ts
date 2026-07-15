import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { errorResponse, HttpError, json, requireMutationOrigin } from "@/lib/http";
import { storeImageBuffer } from "@/lib/image-store";
import { listImages } from "@/lib/library";
import { keywordArraySchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function filtersFromUrl(url: URL) {
  const group = url.searchParams.get("group");
  const rating = Number(url.searchParams.get("rating") || 0);
  return {
    groupId: group === "ungrouped" ? null : group || undefined,
    keywords: url.searchParams.getAll("keyword"),
    trash: url.searchParams.get("trash") === "only" ? ("only" as const) : ("exclude" as const),
    favorite: url.searchParams.get("favorite") === "1",
    minRating: Number.isFinite(rating) ? rating : 0,
    cursor: url.searchParams.get("cursor"),
    limit: Number(url.searchParams.get("limit") || 40),
  };
}

export function GET(request: Request) {
  try {
    requireAuth(request);
    return json(listImages(filtersFromUrl(new URL(request.url))));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    requireMutationOrigin(request);
    requireAuth(request);
    const form = await request.formData();
    const files = form.getAll("files").filter((entry): entry is File => entry instanceof File);
    if (!files.length) throw new HttpError(400, "请选择至少一张图片");
    if (files.length > 200) throw new HttpError(400, "一次最多上传 200 张图片");
    const keywordRaw = form.get("keywords");
    let keywordInput: unknown = [];
    if (typeof keywordRaw === "string") {
      try {
        keywordInput = JSON.parse(keywordRaw || "[]") as unknown;
      } catch {
        throw new HttpError(400, "关键字格式无效");
      }
    }
    const keywords = keywordArraySchema.parse(keywordInput);
    const groupRaw = form.get("groupId");
    const groupId =
      typeof groupRaw === "string" && groupRaw
        ? z.string().uuid().parse(groupRaw)
        : null;
    const created = [];
    const errors: Array<{ file: string; reason: string }> = [];

    for (const file of files) {
      try {
        created.push(
          await storeImageBuffer({
            buffer: Buffer.from(await file.arrayBuffer()),
            originalName: file.name,
            keywords,
            groupId,
          }),
        );
      } catch (error) {
        errors.push({
          file: file.name,
          reason: error instanceof Error ? error.message : "上传失败",
        });
      }
    }

    return json(
      { created, errors },
      { status: errors.length && created.length ? 207 : errors.length ? 400 : 201 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
