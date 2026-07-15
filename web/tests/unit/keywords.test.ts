import { describe, expect, it } from "vitest";
import { normalizeKeyword, normalizeKeywords, parseKeywordInput } from "@/lib/keywords";

describe("keyword normalization", () => {
  it("trims, folds English case and normalizes whitespace", () => {
    expect(normalizeKeyword("  Funny   CAT  ")).toBe("funny cat");
    expect(normalizeKeyword("　猫　猫　")).toBe("猫 猫");
  });

  it("deduplicates keywords without changing the first display spelling", () => {
    expect(normalizeKeywords(["Cat", " cat ", "猫猫"])).toEqual([
      { name: "Cat", normalized: "cat" },
      { name: "猫猫", normalized: "猫猫" },
    ]);
  });

  it("accepts comma, Chinese comma and newline separated input", () => {
    expect(parseKeywordInput("沙雕，猫猫\n聊天表情")).toEqual(["沙雕", "猫猫", "聊天表情"]);
  });
});
