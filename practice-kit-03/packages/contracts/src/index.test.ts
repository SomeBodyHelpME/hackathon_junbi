import { describe, expect, it } from "vitest";
import { ErrorResponse, FakeLoginRequest, UserListResponse } from "./index";

describe("FakeLoginRequest", () => {
  it("userId가 있으면 통과한다", () => {
    expect(FakeLoginRequest.safeParse({ userId: "u-sangeun" }).success).toBe(true);
  });

  it.each([{}, { userId: "" }, { userId: 1 }, null])("잘못된 입력 %j 는 거부한다", (input) => {
    expect(FakeLoginRequest.safeParse(input).success).toBe(false);
  });
});

describe("UserListResponse", () => {
  it("id와 이름을 가진 사용자 배열", () => {
    expect(UserListResponse.safeParse([{ id: "u-sangeun", name: "상은" }]).success).toBe(true);
    expect(UserListResponse.safeParse([{ id: "u-sangeun" }]).success).toBe(false);
  });
});

describe("ErrorResponse", () => {
  it("공통 에러 형식을 따른다", () => {
    const body = { error: { code: "POLL_CONFIRMED", message: "이미 확정된 투표입니다" } };
    expect(ErrorResponse.parse(body)).toEqual(body);
    expect(ErrorResponse.safeParse({ message: "x" }).success).toBe(false);
  });
});
