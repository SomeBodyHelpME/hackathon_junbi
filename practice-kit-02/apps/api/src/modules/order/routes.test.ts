import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { ORDER_MESSAGES as O, ROUND_MESSAGES as R } from "@kit/contracts";
import { buildApp } from "../../app.js";

// 백엔드 입력 검증·인증 단위 테스트. DB 조회 전에 끝나는 경로만 app.inject()로 확인한다.
let app: FastifyInstance;
let cookie: string;
const roundId = "00000000-0000-4000-8000-000000000000";

beforeEach(async () => {
  app = await buildApp();
  cookie = app.signCookie("u-gwaneung");
});

afterEach(async () => {
  await app.close();
});

const req = (method: "GET" | "POST", url: string, payload?: object, uid: string | null = cookie) =>
  app.inject({ method, url, payload, cookies: uid ? { uid } : {} });

describe("인증 (401)", () => {
  it.each([
    ["GET", "/api/rounds"],
    ["POST", "/api/rounds"],
    ["GET", `/api/rounds/${roundId}`],
    ["POST", `/api/rounds/${roundId}/orders`],
  ] as const)("%s %s 비로그인은 401", async (method, url) => {
    const res = await req(method, url, { quantity: 0 }, null);
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe("UNAUTHORIZED");
  });
});

describe("POST /api/rounds 입력 검증", () => {
  it.each([
    [{ date: "2099-12-01", title: "" }, R.titleRequired],
    [{ date: "", title: "점심" }, R.dateRequired],
  ])("%j → 400", async (payload, message) => {
    const res = await req("POST", "/api/rounds", payload);
    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({ error: { code: "VALIDATION_ERROR", message } });
  });
});

describe("POST /api/rounds/:id/orders 입력 검증", () => {
  it.each([0, 6, 1.5])("수량 %d → 400 (AC-03)", async (quantity) => {
    const res = await req("POST", `/api/rounds/${roundId}/orders`, { menuId: "m-1", quantity });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({ error: { code: "VALIDATION_ERROR", message: O.quantityRange } });
  });

  it("모집 id가 UUID가 아니면 404", async () => {
    const res = await req("POST", "/api/rounds/not-a-uuid/orders", { menuId: "m-1", quantity: 1 });
    expect(res.statusCode).toBe(404);
  });
});

describe("POST /api/rounds/:id/close", () => {
  it("비로그인은 401", async () => {
    const res = await req("POST", `/api/rounds/${roundId}/close`, undefined, null);
    expect(res.statusCode).toBe(401);
  });

  it("모집 id가 UUID가 아니면 404", async () => {
    const res = await req("POST", "/api/rounds/not-a-uuid/close");
    expect(res.statusCode).toBe(404);
  });
});

describe("DELETE /api/orders/:id", () => {
  it("비로그인은 401", async () => {
    const res = await app.inject({ method: "DELETE", url: `/api/orders/${roundId}` });
    expect(res.statusCode).toBe(401);
  });

  it("주문 id가 UUID가 아니면 DB 조회 없이 404", async () => {
    const res = await app.inject({ method: "DELETE", url: "/api/orders/not-a-uuid", cookies: { uid: cookie } });
    expect(res.statusCode).toBe(404);
  });
});
