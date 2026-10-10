import { describe, expect, it } from "vitest";
import { CreateOrderRequest, CreateRoundRequest, ORDER_MESSAGES as O, ROUND_MESSAGES as R } from "./index";

function firstError(schema: { safeParse: (v: unknown) => { success: boolean; error?: { issues: { message: string }[] } } }, input: unknown) {
  const r = schema.safeParse(input);
  return r.success ? undefined : r.error?.issues[0]?.message;
}

describe("CreateRoundRequest", () => {
  it("정상 입력은 통과하고 제목 공백을 제거한다", () => {
    expect(CreateRoundRequest.parse({ date: "2099-12-01", title: " 점심 " }).title).toBe("점심");
  });
  it.each(["", "   "])("제목 %j 은 거부", (title) => {
    expect(firstError(CreateRoundRequest, { date: "2099-12-01", title })).toBe(R.titleRequired);
  });
  it("제목 50자 초과는 거부", () => {
    expect(firstError(CreateRoundRequest, { date: "2099-12-01", title: "가".repeat(51) })).toBe(R.titleTooLong);
    expect(firstError(CreateRoundRequest, { date: "2099-12-01", title: "가".repeat(50) })).toBeUndefined();
  });
  it.each(["", "2099-13-01", "12/01"])("날짜 %j 은 거부", (date) => {
    expect(firstError(CreateRoundRequest, { date, title: "점심" })).toBe(R.dateRequired);
  });
});

describe("CreateOrderRequest", () => {
  const valid = { menuId: "m-1", quantity: 2 };

  it("정상 입력은 통과", () => {
    expect(CreateOrderRequest.parse(valid)).toEqual({ menuId: "m-1", quantity: 2 });
  });

  it.each([1, 5])("수량 경계 %d 는 허용 (AC-03)", (quantity) => {
    expect(firstError(CreateOrderRequest, { ...valid, quantity })).toBeUndefined();
  });

  it.each([0, 6, -1, 1.5, Number.NaN, "2"])("수량 %j 는 거부 (AC-03)", (quantity) => {
    expect(firstError(CreateOrderRequest, { ...valid, quantity })).toBe(O.quantityRange);
  });

  it("메뉴가 없으면 거부", () => {
    expect(firstError(CreateOrderRequest, { ...valid, menuId: "" })).toBe(O.menuRequired);
  });

  it("요청사항은 50자까지, 빈 문자열은 없음으로 처리", () => {
    expect(firstError(CreateOrderRequest, { ...valid, memo: "가".repeat(51) })).toBe(O.memoTooLong);
    expect(CreateOrderRequest.parse({ ...valid, memo: "  " }).memo).toBeUndefined();
    expect(CreateOrderRequest.parse({ ...valid, memo: " 덜 맵게 " }).memo).toBe("덜 맵게");
  });

  it("가격·금액 필드를 보내도 결과에 남지 않는다 (금액은 서버 계산)", () => {
    const parsed = CreateOrderRequest.parse({ ...valid, price: 1, amount: 1 });
    expect(parsed).not.toHaveProperty("price");
    expect(parsed).not.toHaveProperty("amount");
  });
});
