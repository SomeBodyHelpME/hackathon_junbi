import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../../app.js";
import { db, pool } from "../../db/client.js";
import { orders, rounds } from "../../db/schema.js";

// 통합 테스트: 실제 PostgreSQL 필요. 모집·주문 데이터를 지운다.
let app: FastifyInstance;

beforeEach(async () => {
  await db.delete(orders);
  await db.delete(rounds);
  app ??= await buildApp();
});

afterAll(async () => {
  await db.delete(orders);
  await db.delete(rounds);
  await app?.close();
  await pool.end();
});

const as = (userId: string) => ({ uid: app.signCookie(userId) });

async function setup() {
  const round = await app.inject({
    method: "POST",
    url: "/api/rounds",
    cookies: as("u-sangeun"),
    payload: { date: "2099-12-01", title: "12월 1일 점심" },
  });
  const roundId = round.json().id as string;
  const placed = await app.inject({
    method: "POST",
    url: `/api/rounds/${roundId}/orders`,
    cookies: as("u-gwaneung"),
    payload: { menuId: "m-1", quantity: 1 },
  });
  return { roundId, orderId: placed.json().id as string };
}

const cancel = (orderId: string, cookies: Record<string, string>) =>
  app.inject({ method: "DELETE", url: `/api/orders/${orderId}`, cookies });

describe("DELETE /api/orders/:id (REQ-03)", () => {
  it("본인 주문은 204로 삭제되고, 다시 주문할 수 있다 (AC-09)", async () => {
    const { roundId, orderId } = await setup();
    expect((await cancel(orderId, as("u-gwaneung"))).statusCode).toBe(204);
    expect(await db.select().from(orders)).toHaveLength(0);
    const again = await app.inject({
      method: "POST",
      url: `/api/rounds/${roundId}/orders`,
      cookies: as("u-gwaneung"),
      payload: { menuId: "m-2", quantity: 1 },
    });
    expect(again.statusCode).toBe(201);
  });

  it("타인 주문은 403 FORBIDDEN, 주문 유지 (AC-11) — 모집 개설자라도 마찬가지", async () => {
    const { orderId } = await setup();
    for (const userId of ["u-byeongwook", "u-sangeun"]) {
      const res = await cancel(orderId, as(userId));
      expect(res.statusCode).toBe(403);
      expect(res.json()).toEqual({ error: { code: "FORBIDDEN", message: "본인 주문만 취소할 수 있습니다" } });
    }
    expect(await db.select().from(orders)).toHaveLength(1);
  });

  it("마감된 모집의 본인 주문은 409 ROUND_CLOSED, 주문 유지 (AC-12)", async () => {
    const { roundId, orderId } = await setup();
    await app.inject({ method: "POST", url: `/api/rounds/${roundId}/close`, cookies: as("u-sangeun") });
    const res = await cancel(orderId, as("u-gwaneung"));
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe("ROUND_CLOSED");
    expect(await db.select().from(orders)).toHaveLength(1);
  });

  it("위조 쿠키는 401, 없는 주문은 404", async () => {
    const { orderId } = await setup();
    expect((await cancel(orderId, { uid: "u-gwaneung.forged" })).statusCode).toBe(401);
    expect((await cancel("00000000-0000-4000-8000-000000000000", as("u-gwaneung"))).statusCode).toBe(404);
    expect(await db.select().from(orders)).toHaveLength(1);
  });
});
