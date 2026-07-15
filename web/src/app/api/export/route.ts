import { Readable } from "node:stream";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { createBackupArchive } from "@/lib/archive";
import { errorResponse, readJson, requireMutationOrigin } from "@/lib/http";

const exportSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(10_000).optional(),
});

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    requireMutationOrigin(request);
    requireAuth(request);
    const { ids } = await readJson(request, exportSchema);
    const archive = createBackupArchive(ids);
    const date = new Date().toISOString().slice(0, 10);
    return new Response(Readable.toWeb(archive) as ReadableStream, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="shentuji-backup-${date}.zip"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
