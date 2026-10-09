import { describe, expect, it } from "vitest";
import { ErrorResponse, FakeLoginRequest, Room } from "./index";

describe("FakeLoginRequest", () => {
  it("userId가 있으면 통과한다", () => {
    expect(FakeLoginRequest.safeParse({ userId: "u-sangeun" }).success).toBe(true);
  });

  it.each([{}, { userId: "" }, { userId: 1 }, null])("잘못된 입력 %j 는 거부한다", (input) => {
    expect(FakeLoginRequest.safeParse(input).success).toBe(false);
  });
});

describe("Room", () => {
  it("수용 인원은 양의 정수여야 한다", () => {
    expect(Room.safeParse({ id: "r-1", name: "한라", capacity: 4 }).success).toBe(true);
    expect(Room.safeParse({ id: "r-1", name: "한라", capacity: 0 }).success).toBe(false);
    expect(Room.safeParse({ id: "r-1", name: "한라", capacity: 1.5 }).success).toBe(false);
  });
});

describe("ErrorResponse", () => {
  it("공통 에러 형식을 따른다", () => {
    const body = { error: { code: "RESERVATION_CONFLICT", message: "이미 예약된 시간입니다" } };
    expect(ErrorResponse.parse(body)).toEqual(body);
    expect(ErrorResponse.safeParse({ message: "x" }).success).toBe(false);
  });
});
