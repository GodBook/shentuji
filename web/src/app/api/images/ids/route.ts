import { requireAuth } from "@/lib/auth";
import { errorResponse, json } from "@/lib/http";
import { listImageIds } from "@/lib/library";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  try {
    requireAuth(request);
    const url = new URL(request.url);
    const group = url.searchParams.get("group");
    const rating = Number(url.searchParams.get("rating") || 0);
    const ids = listImageIds({
      groupId: group === "ungrouped" ? null : group || undefined,
      keywords: url.searchParams.getAll("keyword"),
      trash: url.searchParams.get("trash") === "only" ? "only" : "exclude",
      favorite: url.searchParams.get("favorite") === "1",
      minRating: Number.isFinite(rating) ? rating : 0,
    });
    return json({ ids });
  } catch (error) {
    return errorResponse(error);
  }
}
