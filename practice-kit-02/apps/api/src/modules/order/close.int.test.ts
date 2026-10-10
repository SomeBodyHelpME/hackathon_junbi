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
  return res.json().id as string;
}

const order = (roundId: string, userId: string, payload: object) =>
  app.inject({ method: "POST", url: `/api/rounds/${roundId}/orders`, cookies: as(userId), payload });
const close = (roundId: string, userId: string) =>
  app.inject({ method: "POST", url: `/api/rounds/${roundId}/close`, cookies: as(userId) });
const detail = (roundId: string) =>
  app.inject({ method: "GET", url: `/api/rounds/${roundId}`, cookies: as("u-sangeun") });

describe("마감 (REQ-02)", () => {
  it("개설자는 마감할 수 있고, 이후 주문은 409 ROUND_CLOSED (AC-05, AC-06)", async () => {
    const id = await openRound();
    expect((await close(id, "u-sangeun")).statusCode).toBe(204);
    expect((await detail(id)).json().status).toBe("closed");

    const res = await order(id, "u-gwaneung", { menuId: "m-1", quantity: 1 });
    expect(res.statusCode).toBe(409);
    expect(res.json()).toEqual({ error: { code: "ROUND_CLOSED", message: "주문이 마감되었습니다" } });
  });

  it("개설자가 아니면 403, 상태는 모집 중 유지 (AC-08)", async () => {
    const id = await openRound();
    const res = await close(id, "u-gwaneung");
    expect(res.statusCode).toBe(403);
    expect(res.json().error.code).toBe("FORBIDDEN");
    expect((await detail(id)).json().status).toBe("open");
  });

  it("이미 마감된 모집을 다시 마감하면 409", async () => {
    const id = await openRound();
    await close(id, "u-sangeun");
    expect((await close(id, "u-sangeun")).statusCode).toBe(409);
  });

  it("마감 트랜잭션이 진행 중이면 주문은 기다렸다가 409를 받는다 (마감 뒤 주문 방지)", async () => {
    const id = await openRound();
    const client = await pool.connect();
    try {
      // 다른 트랜잭션이 마감을 진행 중인 상황을 만든다.
      await client.query("BEGIN");
      await client.query("SELECT 1 FROM rounds WHERE id = $1 FOR UPDATE", [id]);

      const pending = order(id, "u-gwaneung", { menuId: "m-1", quantity: 1 });
      await new Promise((r) => setTimeout(r, 200)); // 주문 요청이 잠금 대기에 들어가도록

      await client.query("UPDATE rounds SET status = 'closed' WHERE id = $1", [id]);
      await client.query("COMMIT");

      const res = await pending;
      expect(res.statusCode).toBe(409);
      expect(res.json().error.code).toBe("ROUND_CLOSED");
      expect(await db.select().from(orders)).toHaveLength(0);
    } finally {
      client.release();
    }
  });
});

describe("취합 (REQ-02)", () => {
  it("메뉴별 수량·금액과 총액을 DB 가격으로 계산한다 (AC-07)", async () => {
    const id = await openRound();
    await order(id, "u-sangeun", { menuId: "m-1", quantity: 2 });
    await order(id, "u-gwaneung", { menuId: "m-1", quantity: 1 });
    await order(id, "u-byeongwook", { menuId: "m-3", quantity: 1 });

    expect((await detail(id)).json().summary).toEqual({
      items: [
        { menuId: "m-1", menuName: "김치찌개", quantity: 3, amount: 27000 },
        { menuId: "m-3", menuName: "제육볶음", quantity: 1, amount: 10000 },
      ],
      total: 37000,
    });
  });

  it("클라이언트가 가격·금액을 보내도 무시하고 DB 가격을 쓴다", async () => {
    const id = await openRound();
    const res = await order(id, "u-gwaneung", { menuId: "m-3", quantity: 2, price: 1, amount: 2 });
    expect(res.statusCode).toBe(201);
    expect(res.json().amount).toBe(20000);
    expect((await detail(id)).json().summary.total).toBe(20000);
  });

  it("주문이 없으면 빈 취합표와 총액 0", async () => {
    const id = await openRound();
    expect((await detail(id)).json().summary).toEqual({ items: [], total: 0 });
  });
});
