import crypto from "node:crypto";
import { hash, verify } from "@node-rs/argon2";
import { cookies } from "next/headers";
import { getDb, hasAdmin } from "@/lib/db";
import { HttpError } from "@/lib/http";

export const SESSION_COOKIE = "shentuji_session";
const SESSION_MS = 30 * 24 * 60 * 60 * 1000;

function tokenHash(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function createAdmin(password: string) {
  if (hasAdmin()) throw new HttpError(409, "站点已经完成初始化");
  const passwordHash = await hash(password, {
    algorithm: 2, // Algorithm.Argon2id
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
  });
  getDb()
    .prepare("INSERT INTO admins (id, password_hash, created_at) VALUES (1, ?, ?)")
    .run(passwordHash, new Date().toISOString());
}

export async function verifyAdminPassword(password: string) {
  const admin = getDb()
    .prepare("SELECT password_hash AS passwordHash FROM admins WHERE id = 1")
    .get() as { passwordHash: string } | undefined;
  if (!admin) return false;
  return verify(admin.passwordHash, password);
}

export function createSession() {
  const db = getDb();
  const rawToken = crypto.randomBytes(32).toString("base64url");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_MS);
  db.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(now.toISOString());
  db.prepare(
    "INSERT INTO sessions (id, token_hash, created_at, expires_at) VALUES (?, ?, ?, ?)",
  ).run(crypto.randomUUID(), tokenHash(rawToken), now.toISOString(), expiresAt.toISOString());
  return { rawToken, expiresAt };
}

export function deleteSession(rawToken: string | undefined) {
  if (!rawToken) return;
  getDb().prepare("DELETE FROM sessions WHERE token_hash = ?").run(tokenHash(rawToken));
}

export function isValidSession(rawToken: string | undefined) {
  if (!rawToken) return false;
  const session = getDb()
    .prepare("SELECT expires_at AS expiresAt FROM sessions WHERE token_hash = ?")
    .get(tokenHash(rawToken)) as { expiresAt: string } | undefined;
  if (!session) return false;
  if (new Date(session.expiresAt).getTime() <= Date.now()) {
    deleteSession(rawToken);
    return false;
  }
  return true;
}

function requestCookie(request: Request, name: string) {
  const raw = request.headers.get("cookie") ?? "";
  for (const pair of raw.split(";")) {
    const [key, ...value] = pair.trim().split("=");
    if (key === name) return decodeURIComponent(value.join("="));
  }
}

export function requireAuth(request: Request) {
  if (!isValidSession(requestCookie(request, SESSION_COOKIE))) {
    throw new HttpError(401, "请先登录");
  }
}

export async function getPageAuthState() {
  const store = await cookies();
  return {
    setup: hasAdmin(),
    authenticated: isValidSession(store.get(SESSION_COOKIE)?.value),
  };
}

export function sessionCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.COOKIE_SECURE === "1",
    path: "/",
    expires: expiresAt,
  };
}
