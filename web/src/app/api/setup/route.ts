import { NextResponse } from "next/server";
import { createAdmin, createSession, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";
import { errorResponse, readJson, requireMutationOrigin } from "@/lib/http";
import { authBodySchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    requireMutationOrigin(request);
    const { password } = await readJson(request, authBodySchema);
    await createAdmin(password);
    const session = createSession();
    const response = NextResponse.json({ ok: true }, { status: 201 });
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
