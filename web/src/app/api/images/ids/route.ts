import { requireAuth } from "@/lib/auth";
import { errorResponse, json } from "@/lib/http";
import { listImageIds } from "@/lib/library";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  try {
    requireAuth(request);
    const url = new URL(request.url);
    const group = url.searchParams.get("group");
    const ids = listImageIds({
      groupId: group === "ungrouped" ? null : group || undefined,
      keywords: url.searchParams.getAll("keyword"),
    });
    return json({ ids });
  } catch (error) {
    return errorResponse(error);
  }
}
