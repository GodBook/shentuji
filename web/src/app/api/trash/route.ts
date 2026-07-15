import { requireAuth } from "@/lib/auth";
import { deleteStoredImages } from "@/lib/image-store";
import { errorResponse, json, requireMutationOrigin } from "@/lib/http";
import { listImageIds } from "@/lib/library";

export async function DELETE(request: Request) {
  try {
    requireMutationOrigin(request);
    requireAuth(request);
    return json(await deleteStoredImages(listImageIds({ trash: "only" })));
  } catch (error) {
    return errorResponse(error);
  }
}
