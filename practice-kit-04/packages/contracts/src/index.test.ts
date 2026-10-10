import { describe, expect, it } from "vitest";
import { Book, ErrorResponse, FakeLoginRequest } from "./index";

describe("FakeLoginRequest", () => {
  it("userId가 있으면 통과한다", () => {
    expect(FakeLoginRequest.safeParse({ userId: "u-sangeun" }).success).toBe(true);
  });

  it.each([{}, { userId: "" }, { userId: 1 }, null])("잘못된 입력 %j 는 거부한다", (input) => {
    expect(FakeLoginRequest.safeParse(input).success).toBe(false);
  });
});

describe("Book", () => {
  it("권수는 0 이상의 정수", () => {
    expect(Book.safeParse({ id: "b-1", title: "클린 코드", totalCopies: 2, availableCopies: 0 }).success).toBe(true);
    expect(Book.safeParse({ id: "b-1", title: "클린 코드", totalCopies: 2, availableCopies: -1 }).success).toBe(false);
  });
});

describe("ErrorResponse", () => {
  it("공통 에러 형식을 따른다", () => {
    const body = { error: { code: "OUT_OF_STOCK", message: "대여 가능한 재고가 없습니다" } };
    expect(ErrorResponse.parse(body)).toEqual(body);
    expect(ErrorResponse.safeParse({ message: "x" }).success).toBe(false);
  });
});
