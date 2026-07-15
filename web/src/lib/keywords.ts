export const MAX_KEYWORD_LENGTH = 32;
export const MAX_KEYWORDS_PER_IMAGE = 30;

export function keywordDisplayName(value: string) {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ");
}

export function normalizeKeyword(value: string) {
  return keywordDisplayName(value).toLocaleLowerCase("en-US");
}

export function normalizeKeywords(values: readonly string[]) {
  const result: Array<{ name: string; normalized: string }> = [];
  const seen = new Set<string>();

  for (const raw of values) {
    const name = keywordDisplayName(raw);
    const normalized = normalizeKeyword(raw);
    if (!name || name.length > MAX_KEYWORD_LENGTH || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push({ name, normalized });
    if (result.length >= MAX_KEYWORDS_PER_IMAGE) break;
  }

  return result;
}

export function parseKeywordInput(value: string) {
  return normalizeKeywords(value.split(/[,，\n]/)).map((item) => item.name);
}
