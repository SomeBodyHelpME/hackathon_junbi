import { describe, expect, it } from "vitest";
import { CreatePollRequest, POLL_MESSAGES as M, RespondRequest } from "./index";

const at = (hhmm: string, date = "2099-12-01") => ({ startsAt: `${date}T${hhmm}:00+09:00` });
const firstError = (input: unknown) => {
  const r = CreatePollRequest.safeParse(input);
  return r.success ? undefined : r.error.issues[0]?.message;
};

describe("CreatePollRequest", () => {
  it("정상 입력은 통과", () => {
    expect(firstError({ title: "주간 회의", candidates: [at("10:00"), at("14:00")] })).toBeUndefined();
  });

  it.each([0, 1, 6])("후보 %d개는 거부 (AC-02)", (n) => {
    const candidates = Array.from({ length: n }, (_, i) => at(`${String(9 + i).padStart(2, "0")}:00`));
    expect(firstError({ title: "주간 회의", candidates })).toBe(M.candidateCount);
  });

  it.each([2, 5])("후보 %d개는 허용 (경계)", (n) => {
    const candidates = Array.from({ length: n }, (_, i) => at(`${String(9 + i).padStart(2, "0")}:00`));
    expect(firstError({ title: "주간 회의", candidates })).toBeUndefined();
  });

  it("같은 시간이 중복되면 거부 (AC-03)", () => {
    expect(firstError({ title: "주간 회의", candidates: [at("10:00"), at("10:00")] })).toBe(M.candidateDuplicate);
  });

  it("표기가 달라도 같은 순간이면 중복 (+09:00 10:00 = Z 01:00)", () => {
    expect(
      firstError({ title: "주간 회의", candidates: [at("10:00"), { startsAt: "2099-12-01T01:00:00Z" }] }),
    ).toBe(M.candidateDuplicate);
  });

  it("다른 날 같은 시각은 중복이 아니다", () => {
    expect(firstError({ title: "주간 회의", candidates: [at("10:00"), at("10:00", "2099-12-02")] })).toBeUndefined();
  });

  it("30분 단위가 아니면 거부", () => {
    expect(firstError({ title: "주간 회의", candidates: [at("10:15"), at("11:00")] })).toBe(M.slotUnit);
  });

  it("제목이 비거나 50자를 넘으면 거부", () => {
    expect(firstError({ title: "  ", candidates: [at("10:00"), at("11:00")] })).toBe(M.titleRequired);
    expect(firstError({ title: "가".repeat(51), candidates: [at("10:00"), at("11:00")] })).toBe(M.titleTooLong);
  });

  it("후보 형식이 틀리면 거부", () => {
    expect(firstError({ title: "주간 회의", candidates: [{ startsAt: "2099-12-01 10:00" }, at("11:00")] })).toBe(
      M.candidateInvalid,
    );
  });
});

describe("RespondRequest", () => {
  const id = "11111111-1111-4111-8111-111111111111";
  it("후보를 하나 이상 골라야 한다 (AC-07)", () => {
    const r = RespondRequest.safeParse({ candidateIds: [] });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toBe(M.choiceRequired);
  });
  it("UUID 형식의 후보 id만 받는다", () => {
    expect(RespondRequest.safeParse({ candidateIds: [id] }).success).toBe(true);
    expect(RespondRequest.safeParse({ candidateIds: ["c-1"] }).success).toBe(false);
  });
});
