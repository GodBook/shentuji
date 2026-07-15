import { NextRequest, NextResponse } from "next/server";
import { deleteSession, SESSION_COOKIE } from "@/lib/auth";
import { errorResponse, requireMutationOrigin } from "@/lib/http";

export async function POST(request: NextRequest) {
  try {
    requireMutationOrigin(request);
    deleteSession(request.cookies.get(SESSION_COOKIE)?.value);
    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.COOKIE_SECURE === "1",
      path: "/",
      expires: new Date(0),
    });
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
