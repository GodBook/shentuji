import { describe, expect, it } from "vitest";
import { hammingDistance } from "@/lib/similarity";

describe("perceptual hash distance", () => {
  it("counts differing bits in 64-bit hashes", () => {
    expect(hammingDistance("0000000000000000", "0000000000000000")).toBe(0);
    expect(hammingDistance("0000000000000000", "000000000000000f")).toBe(4);
    expect(hammingDistance("ffffffffffffffff", "0000000000000000")).toBe(64);
  });

  it("rejects malformed hashes", () => {
    expect(() => hammingDistance("abc", "0000000000000000")).toThrow("感知哈希格式无效");
  });
});
