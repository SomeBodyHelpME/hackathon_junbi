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

async function openRound(userId = "u-sangeun") {
  const res = await app.inject({
    method: "POST",
    url: "/api/rounds",
    cookies: as(userId),
    payload: { date: "2099-12-01", title: "12월 1일 점심" },
  });
  expect(res.statusCode).toBe(201);
  return res.json().id as string;
}

function order(roundId: string, userId: string, payload: object) {
  return app.inject({ method: "POST", url: `/api/rounds/${roundId}/orders`, cookies: as(userId), payload });
}

describe("주문 (REQ-01)", () => {
  it("주문하면 모집 상세에 서버가 계산한 금액과 함께 표시된다", async () => {
    const roundId = await openRound();
    const res = await order(roundId, "u-gwaneung", { menuId: "m-1", quantity: 2, memo: "덜 맵게" });
    expect(res.statusCode).toBe(201);

    const detail = await app.inject({ method: "GET", url: `/api/rounds/${roundId}`, cookies: as("u-sangeun") });
    expect(detail.json().orders).toMatchObject([
      { userName: "관응", menuName: "김치찌개", quantity: 2, amount: 18000, memo: "덜 맵게" },
    ]);
  });

  it("같은 모집에 두 번 주문하면 409 ORDER_DUPLICATE, 기존 주문 유지 (AC-04)", async () => {
    const roundId = await openRound();
    expect((await order(roundId, "u-gwaneung", { menuId: "m-2", quantity: 1 })).statusCode).toBe(201);
    const dup = await order(roundId, "u-gwaneung", { menuId: "m-1", quantity: 1 });
    expect(dup.statusCode).toBe(409);
    expect(dup.json()).toEqual({ error: { code: "ORDER_DUPLICATE", message: "이미 주문했습니다" } });
    const rows = await db.select().from(orders);
    expect(rows).toHaveLength(1);
    expect(rows[0].menuId).toBe("m-2");
  });

  it("같은 사용자가 동시에 10번 주문해도 1건만 생성된다 (DB 유니크 제약)", async () => {
    const roundId = await openRound();
    const results = await Promise.all(
      Array.from({ length: 10 }, () => order(roundId, "u-gwaneung", { menuId: "m-1", quantity: 1 })),
    );
    const statuses = results.map((r) => r.statusCode);
    expect(statuses.filter((s) => s === 201)).toHaveLength(1);
    expect(statuses.filter((s) => s === 409)).toHaveLength(9);
    expect(await db.select().from(orders)).toHaveLength(1);
  });

  it("다른 사용자는 같은 모집에 각자 주문할 수 있다", async () => {
    const roundId = await openRound();
    const results = await Promise.all(
      ["u-sangeun", "u-gwaneung", "u-byeongwook"].map((u) => order(roundId, u, { menuId: "m-1", quantity: 1 })),
    );
    expect(results.map((r) => r.statusCode)).toEqual([201, 201, 201]);
  });

  it("없는 메뉴는 400 INVALID_MENU, 없는 모집은 404", async () => {
    const roundId = await openRound();
    expect((await order(roundId, "u-gwaneung", { menuId: "m-999", quantity: 1 })).json().error.code).toBe("INVALID_MENU");
    expect(
      (await order("00000000-0000-4000-8000-000000000000", "u-gwaneung", { menuId: "m-1", quantity: 1 })).statusCode,
    ).toBe(404);
  });
});
