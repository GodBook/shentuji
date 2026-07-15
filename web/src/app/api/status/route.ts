import { hasAdmin } from "@/lib/db";
import { SESSION_COOKIE, isValidSession } from "@/lib/auth";
import { json } from "@/lib/http";

export const dynamic = "force-dynamic";

function cookieValue(request: Request) {
  const cookies = request.headers.get("cookie") ?? "";
  const pair = cookies
    .split(";")
    .map((value) => value.trim())
    .find((value) => value.startsWith(`${SESSION_COOKIE}=`));
  return pair ? decodeURIComponent(pair.slice(SESSION_COOKIE.length + 1)) : undefined;
}

export function GET(request: Request) {
  return json({ setup: hasAdmin(), authenticated: isValidSession(cookieValue(request)) });
}
