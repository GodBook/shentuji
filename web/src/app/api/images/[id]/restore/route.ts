import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { errorResponse, HttpError, json, requireMutationOrigin } from "@/lib/http";
import { getImagesByIds, restoreImages } from "@/lib/library";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  try {
    requireMutationOrigin(request);
    requireAuth(request);
    const id = z.string().uuid().parse((await context.params).id);
    if (!restoreImages([id])) throw new HttpError(404, "回收站中没有这张图片");
    return json({ image: getImagesByIds([id])[0] });
  } catch (error) {
    return errorResponse(error);
  }
}
