import { describe, expect, it } from "vitest";
import { overlaps } from "./overlap.js";
import { EXISTING, OVERLAP_CASES, at } from "./overlap.cases.js";

const existing = { start: at(EXISTING.start), end: at(EXISTING.end) };

describe("overlaps: 기존 10:00~11:00", () => {
  it.each(OVERLAP_CASES)("%s %s~%s → %s", (_label, start, end, expected) => {
    const candidate = { start: at(start), end: at(end) };
    expect(overlaps(candidate, existing)).toBe(expected);
    // 대칭성: 순서를 바꿔도 결과가 같아야 한다.
    expect(overlaps(existing, candidate)).toBe(expected);
  });
});
