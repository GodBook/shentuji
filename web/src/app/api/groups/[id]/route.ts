import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { deleteGroup, renameGroup } from "@/lib/library";
import { errorResponse, json, readJson, requireMutationOrigin } from "@/lib/http";
import { groupBodySchema } from "@/lib/validation";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    requireMutationOrigin(request);
    requireAuth(request);
    const id = z.string().uuid().parse((await context.params).id);
    const { name } = await readJson(request, groupBodySchema);
    return json({ group: renameGroup(id, name) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    requireMutationOrigin(request);
    requireAuth(request);
    const id = z.string().uuid().parse((await context.params).id);
    deleteGroup(id);
    return json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
