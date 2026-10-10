import { describe, expect, it } from "vitest";
import { CreateReservationRequest, RESERVATION_MESSAGES as M } from "./index";

const valid = {
  roomId: "r-1",
  title: "주간 회의",
  startAt: "2099-12-01T10:00:00+09:00",
  endAt: "2099-12-01T11:00:00+09:00",
};

// 실패 시 첫 번째 오류 메시지 (API가 응답에 쓰는 메시지와 같다)
function firstError(input: unknown): string | undefined {
  const r = CreateReservationRequest.safeParse(input);
  return r.success ? undefined : r.error.issues[0]?.message;
}

describe("CreateReservationRequest", () => {
  it("정상 입력은 통과하고 제목 앞뒤 공백을 제거한다", () => {
    const r = CreateReservationRequest.parse({ ...valid, title: "  주간 회의 " });
    expect(r.title).toBe("주간 회의");
  });

  describe("제목 (AC-03)", () => {
    it.each(["", "   "])("제목 %j 은 '제목을 입력하세요'", (title) => {
      expect(firstError({ ...valid, title })).toBe(M.titleRequired);
    });

    it("제목이 없으면 '제목을 입력하세요'", () => {
      const rest: Partial<typeof valid> = { ...valid };
      delete rest.title;
      expect(firstError(rest)).toBe(M.titleRequired);
    });

    it("100자 초과는 거부", () => {
      expect(firstError({ ...valid, title: "가".repeat(101) })).toBe(M.titleTooLong);
      expect(firstError({ ...valid, title: "가".repeat(100) })).toBeUndefined();
    });
  });

  describe("시작·종료 시각 (AC-04)", () => {
    it("종료가 시작보다 빠르면 거부", () => {
      expect(
        firstError({ ...valid, startAt: "2099-12-01T11:00:00+09:00", endAt: "2099-12-01T10:00:00+09:00" }),
      ).toBe(M.endAfterStart);
    });

    it("종료와 시작이 같으면 거부", () => {
      expect(
        firstError({ ...valid, startAt: "2099-12-01T10:00:00+09:00", endAt: "2099-12-01T10:00:00+09:00" }),
      ).toBe(M.endAfterStart);
    });

    it("30분 경계: 10:00~10:30은 허용", () => {
      expect(firstError({ ...valid, endAt: "2099-12-01T10:30:00+09:00" })).toBeUndefined();
    });
  });

  describe("30분 단위", () => {
    it.each(["2099-12-01T10:15:00+09:00", "2099-12-01T10:00:30+09:00"])("%s 는 거부", (startAt) => {
      expect(firstError({ ...valid, startAt })).toBe(M.slotUnit);
    });
  });

  describe("형식", () => {
    it.each([
      ["시간대 없는 시각", "2099-12-01T10:00:00"],
      ["빈 문자열", ""],
      ["날짜 아님", "내일 10시"],
    ])("%s 는 '날짜와 시각을 선택하세요'", (_label, startAt) => {
      expect(firstError({ ...valid, startAt })).toBe(M.dateTimeRequired);
    });

    it("회의실이 비면 거부", () => {
      expect(firstError({ ...valid, roomId: "" })).toBe(M.roomRequired);
    });
  });
});
