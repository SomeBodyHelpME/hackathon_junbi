import { describe, expect, it } from "vitest";
import { addDays, seoulDateOf } from "./due.js";

describe("seoulDateOf: Asia/Seoul 날짜 경계", () => {
  it.each([
    ["2099-12-01T14:59:59Z", "2099-12-01"], // 서울 23:59:59
    ["2099-12-01T15:00:00Z", "2099-12-02"], // 서울 다음 날 00:00
    ["2099-12-31T15:00:00Z", "2100-01-01"], // 연도 경계
  ])("%s → %s", (iso, expected) => {
    expect(seoulDateOf(new Date(iso))).toBe(expected);
  });
});

describe("addDays", () => {
  it.each([
    ["2099-12-01", 14, "2099-12-15"],
    ["2099-12-25", 14, "2100-01-08"], // 연도 경계
    ["2100-02-20", 14, "2100-03-06"], // 2100년은 평년(2월 28일)
    ["2096-02-20", 14, "2096-03-05"], // 윤년(2월 29일)
    ["2099-12-15", 7, "2099-12-22"], // 연장
  ])("%s + %d일 → %s", (ymd, days, expected) => {
    expect(addDays(ymd, days)).toBe(expected);
  });
});
