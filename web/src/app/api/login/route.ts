import { NextResponse } from "next/server";
import {
  createSession,
  SESSION_COOKIE,
  sessionCookieOptions,
  verifyAdminPassword,
} from "@/lib/auth";
import { hasAdmin } from "@/lib/db";
import {
  errorResponse,
  getClientAddress,
  HttpError,
  readJson,
  requireMutationOrigin,
} from "@/lib/http";
import { clearRateLimit, consumeRateLimit } from "@/lib/rate-limit";
import { authBodySchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    requireMutationOrigin(request);
    if (!hasAdmin()) throw new HttpError(409, "请先完成首次设置");
    const address = getClientAddress(request);
    const key = `login:${address}`;
    const limit = consumeRateLimit(key, { limit: 5, windowMs: 15 * 60 * 1000 });
    if (!limit.allowed) {
      throw new HttpError(429, "尝试次数过多，请稍后再试", {
        retryAfterSeconds: Math.ceil(limit.retryAfterMs / 1000),
      });
    }
    const { password } = await readJson(request, authBodySchema);
    if (!(await verifyAdminPassword(password))) throw new HttpError(401, "密码不正确");
    clearRateLimit(key);

    const session = createSession();
    const response = NextResponse.json({ ok: true });
    response.cookies.set(
      SESSION_COOKIE,
      session.rawToken,
      sessionCookieOptions(session.expiresAt),
    );
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
