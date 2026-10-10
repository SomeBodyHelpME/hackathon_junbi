import { describe, expect, it } from "vitest";
import { ErrorResponse, FakeLoginRequest, Menu } from "./index";

describe("FakeLoginRequest", () => {
  it("userId가 있으면 통과한다", () => {
    expect(FakeLoginRequest.safeParse({ userId: "u-sangeun" }).success).toBe(true);
  });

  it.each([{}, { userId: "" }, { userId: 1 }, null])("잘못된 입력 %j 는 거부한다", (input) => {
    expect(FakeLoginRequest.safeParse(input).success).toBe(false);
  });
});

describe("Menu", () => {
  it("가격은 0 이상의 정수여야 한다", () => {
    expect(Menu.safeParse({ id: "m-1", name: "김치찌개", price: 9000 }).success).toBe(true);
    expect(Menu.safeParse({ id: "m-1", name: "김치찌개", price: -1 }).success).toBe(false);
    expect(Menu.safeParse({ id: "m-1", name: "김치찌개", price: 9000.5 }).success).toBe(false);
  });
});

describe("ErrorResponse", () => {
  it("공통 에러 형식을 따른다", () => {
    const body = { error: { code: "ROUND_CLOSED", message: "주문이 마감되었습니다" } };
    expect(ErrorResponse.parse(body)).toEqual(body);
    expect(ErrorResponse.safeParse({ message: "x" }).success).toBe(false);
  });
});
