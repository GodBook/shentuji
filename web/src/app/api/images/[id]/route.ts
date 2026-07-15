import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { deleteStoredImage } from "@/lib/image-store";
import { errorResponse, json, readJson, requireMutationOrigin } from "@/lib/http";
import { updateImage } from "@/lib/library";
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
    await deleteStoredImage(id);
    return json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
