import { requireAuth } from "@/lib/auth";
import { importBackupArchive } from "@/lib/archive";
import { errorResponse, HttpError, json, requireMutationOrigin } from "@/lib/http";

const MAX_ARCHIVE_BYTES = 512 * 1024 * 1024;

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    requireMutationOrigin(request);
    requireAuth(request);
    const form = await request.formData();
    const archive = form.get("archive");
    if (!(archive instanceof File)) throw new HttpError(400, "请选择 ZIP 备份文件");
    if (!archive.name.toLocaleLowerCase("en-US").endsWith(".zip")) {
      throw new HttpError(415, "仅支持 ZIP 备份文件");
    }
    if (archive.size > MAX_ARCHIVE_BYTES) throw new HttpError(413, "备份文件不能超过 512MB");
    const report = await importBackupArchive(Buffer.from(await archive.arrayBuffer()));
    return json(report, { status: report.skipped ? 207 : 200 });
  } catch (error) {
    return errorResponse(error);
  }
}
