import { requireAuth } from "@/lib/auth";
import { errorResponse, json } from "@/lib/http";
import { listKeywordSuggestions } from "@/lib/library";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  try {
    requireAuth(request);
    const query = new URL(request.url).searchParams.get("q")?.slice(0, 32) ?? "";
    return json({ keywords: listKeywordSuggestions(query) });
  } catch (error) {
    return errorResponse(error);
  }
}
