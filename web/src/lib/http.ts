import { ZodError, type ZodType } from "zod";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export function json(data: unknown, init?: ResponseInit) {
  return Response.json(data, init);
}

export async function readJson<T>(request: Request, schema: ZodType<T>) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new HttpError(400, "请求内容不是有效的 JSON");
  }
  return schema.parse(body);
}

export function requireMutationOrigin(request: Request) {
  if (process.env.NODE_ENV === "development") return;

  const secFetchSite = request.headers.get("sec-fetch-site");
  if (secFetchSite === "cross-site") {
    throw new HttpError(403, "已拒绝跨站请求");
  }

  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    throw new HttpError(403, "请求来源不受信任");
  }
}

export function errorResponse(error: unknown) {
  if (error instanceof HttpError) {
    return json(
      { error: error.message, ...(error.details ? { details: error.details } : {}) },
      { status: error.status },
    );
  }
  if (error instanceof ZodError) {
    return json(
      { error: "提交的数据不符合要求", details: error.flatten() },
      { status: 400 },
    );
  }
  if (error instanceof Error && error.message.includes("UNIQUE constraint failed")) {
    return json({ error: "该名称已经存在" }, { status: 409 });
  }

  console.error(error);
  return json({ error: "服务器处理失败，请稍后重试" }, { status: 500 });
}

export function getClientAddress(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "local"
  );
}
