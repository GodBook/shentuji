import { requireAuth } from "@/lib/auth";
import { deleteStoredImages } from "@/lib/image-store";
import { errorResponse, json, readJson, requireMutationOrigin } from "@/lib/http";
import {
  addKeywordsToImages,
  moveImages,
  removeKeywordsFromImages,
  restoreImages,
  setImagesFavorite,
  setImagesRating,
  trashImages,
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
      case "setFavorite":
        return json({ updated: setImagesFavorite(input.ids, input.favorite) });
      case "setRating":
        return json({ updated: setImagesRating(input.ids, input.rating) });
      case "delete":
        return json({ trashed: trashImages(input.ids) });
      case "restore":
        return json({ restored: restoreImages(input.ids) });
      case "deletePermanent":
        return json(await deleteStoredImages(input.ids));
    }
  } catch (error) {
    return errorResponse(error);
  }
}
