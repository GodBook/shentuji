import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { errorResponse, json } from "@/lib/http";
import { findSimilarImages } from "@/lib/similarity";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  try {
    requireAuth(request);
    const id = z.string().uuid().parse((await context.params).id);
    const distance = z.coerce.number().int().min(0).max(32).catch(12).parse(
      new URL(request.url).searchParams.get("distance") ?? 12,
    );
    return json(await findSimilarImages(id, distance));
  } catch (error) {
    return errorResponse(error);
  }
}
