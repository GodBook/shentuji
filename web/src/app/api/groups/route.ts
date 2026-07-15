import { createGroup, getLibraryStats, listGroups } from "@/lib/library";
import { errorResponse, json, readJson, requireMutationOrigin } from "@/lib/http";
import { requireAuth } from "@/lib/auth";
import { groupBodySchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  try {
    requireAuth(request);
    return json({ groups: listGroups(), stats: getLibraryStats() });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    requireMutationOrigin(request);
    requireAuth(request);
    const { name } = await readJson(request, groupBodySchema);
    return json({ group: createGroup(name) }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
