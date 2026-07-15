import { describe, expect, it } from "vitest";
import { HttpError, requireMutationOrigin } from "@/lib/http";
import { isSafeArchivePath } from "@/lib/image-store";
import { requireAuth } from "@/lib/auth";

describe("request and archive security", () => {
  it("rejects cross-site mutations", () => {
    const request = new Request("http://localhost/api/images", {
      method: "POST",
      headers: { origin: "https://evil.example", "sec-fetch-site": "cross-site" },
    });
    expect(() => requireMutationOrigin(request)).toThrow(HttpError);
  });

  it("allows same-origin mutations", () => {
    const request = new Request("http://localhost/api/images", {
      method: "POST",
      headers: { origin: "http://localhost", "sec-fetch-site": "same-origin" },
    });
    expect(() => requireMutationOrigin(request)).not.toThrow();
  });

  it("blocks ZIP traversal and unsupported extensions", () => {
    expect(isSafeArchivePath("images/abc-123.png")).toBe(true);
    expect(isSafeArchivePath("images/../../secret.png")).toBe(false);
    expect(isSafeArchivePath("images\\secret.png")).toBe(false);
    expect(isSafeArchivePath("images/payload.svg")).toBe(false);
  });

  it("rejects protected requests without a session", () => {
    expect(() => requireAuth(new Request("http://localhost/api/groups"))).toThrow(HttpError);
  });
});
