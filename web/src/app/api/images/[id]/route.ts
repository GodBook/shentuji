import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { deleteStoredImage } from "@/lib/image-store";
import { errorResponse, HttpError, json, readJson, requireMutationOrigin } from "@/lib/http";
import { trashImages, updateImage } from "@/lib/library";
import { imageUpdateSchema } from "@/lib/validation";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    requireMutationOrigin(request);
    requireAuth(request);
    const id = z.string().uuid().parse((await context.params).id);
    const update = await readJson(request, imageUpdateSchema);
    return json({ image: updateImage(id, update) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    requireMutationOrigin(request);
    requireAuth(request);
    const id = z.string().uuid().parse((await context.params).id);
    if (new URL(request.url).searchParams.get("permanent") === "1") {
      await deleteStoredImage(id);
      return json({ permanentlyDeleted: true });
    }
    if (!trashImages([id])) throw new HttpError(404, "图片不存在或已在回收站");
    return json({ trashed: true });
  } catch (error) {
    return errorResponse(error);
  }
}
