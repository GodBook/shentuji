import { requireAuth } from "@/lib/auth";
import { deleteStoredImages } from "@/lib/image-store";
import { errorResponse, json, readJson, requireMutationOrigin } from "@/lib/http";
import {
  addKeywordsToImages,
  moveImages,
  removeKeywordsFromImages,
} from "@/lib/library";
import { bulkActionSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    requireMutationOrigin(request);
    requireAuth(request);
    const input = await readJson(request, bulkActionSchema);
    switch (input.action) {
      case "addKeywords":
        addKeywordsToImages(input.ids, input.keywords);
        return json({ updated: input.ids.length });
      case "removeKeywords":
        removeKeywordsFromImages(input.ids, input.keywords);
        return json({ updated: input.ids.length });
      case "moveGroup":
        moveImages(input.ids, input.groupId);
        return json({ updated: input.ids.length });
      case "delete":
        return json(await deleteStoredImages(input.ids));
    }
  } catch (error) {
    return errorResponse(error);
  }
}
