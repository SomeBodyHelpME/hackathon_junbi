import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { eq, sql } from "drizzle-orm";
import { buildApp } from "../../app.js";
import { db, pool } from "../../db/client.js";
import { books, loans } from "../../db/schema.js";

// 통합 테스트: 실제 PostgreSQL 필요. 대여 기록을 지우고 재고를 되돌린다.
let app: FastifyInstance;

async function resetLoans() {
  await db.delete(loans);
  await db.update(books).set({ availableCopies: sql`${books.totalCopies}` });
}

beforeEach(async () => {
  await resetLoans();
  app ??= await buildApp();
});

afterAll(async () => {
  await resetLoans();
  await app?.close();
  await pool.end();
});

const as = (userId: string) => ({ uid: app.signCookie(userId) });
async function borrow(userId: string, bookId: string) {
  const res = await app.inject({ method: "POST", url: "/api/loans", cookies: as(userId), payload: { bookId } });
  return res.json().id as string;
}
const giveBack = (loanId: string, cookies: Record<string, string>) =>
  app.inject({ method: "POST", url: `/api/loans/${loanId}/return`, cookies });
const available = async (bookId: string) =>
  (await db.select().from(books).where(eq(books.id, bookId)))[0].availableCopies;
const loanRow = async (id: string) => (await db.select().from(loans).where(eq(loans.id, id)))[0];

describe("반납 (REQ-02)", () => {
  it("본인 대여는 204로 반납되고 재고가 복구된다 (AC-05)", async () => {
    const id = await borrow("u-sangeun", "b-2");
    expect(await available("b-2")).toBe(0);
    expect((await giveBack(id, as("u-sangeun"))).statusCode).toBe(204);
    expect(await available("b-2")).toBe(1);
    expect((await loanRow(id)).returnedAt).not.toBeNull();
  });

  it("타인 대여는 403 FORBIDDEN, 대여·재고 유지 (AC-06)", async () => {
    const id = await borrow("u-gwaneung", "b-2");
    const res = await giveBack(id, as("u-sangeun"));
    expect(res.statusCode).toBe(403);
    expect(res.json()).toEqual({ error: { code: "FORBIDDEN", message: "본인 대여만 처리할 수 있습니다" } });
    expect((await loanRow(id)).returnedAt).toBeNull();
    expect(await available("b-2")).toBe(0);
  });

  it("이미 반납된 대여는 409 ALREADY_RETURNED, 재고는 한 번만 복구 (AC-07)", async () => {
    const id = await borrow("u-sangeun", "b-2");
    await giveBack(id, as("u-sangeun"));
    const res = await giveBack(id, as("u-sangeun"));
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe("ALREADY_RETURNED");
    expect(await available("b-2")).toBe(1);
  });

  it("같은 대여를 동시에 5번 반납해도 1번만 성공하고 재고는 한 번만 복구된다", async () => {
    const id = await borrow("u-sangeun", "b-1");
    const results = await Promise.all(Array.from({ length: 5 }, () => giveBack(id, as("u-sangeun"))));
    expect(results.filter((r) => r.statusCode === 204)).toHaveLength(1);
    expect(results.filter((r) => r.statusCode === 409)).toHaveLength(4);
    expect(await available("b-1")).toBe(2);
  });

  it("위조 쿠키는 401, 없는 대여는 404", async () => {
    const id = await borrow("u-gwaneung", "b-2");
    expect((await giveBack(id, { uid: "u-gwaneung.forged" })).statusCode).toBe(401);
    expect((await giveBack("00000000-0000-4000-8000-000000000000", as("u-gwaneung"))).statusCode).toBe(404);
    expect((await loanRow(id)).returnedAt).toBeNull();
  });

  it("반납 후에는 같은 책을 다시 빌릴 수 있다", async () => {
    const id = await borrow("u-sangeun", "b-2");
    await giveBack(id, as("u-sangeun"));
    const again = await app.inject({ method: "POST", url: "/api/loans", cookies: as("u-sangeun"), payload: { bookId: "b-2" } });
    expect(again.statusCode).toBe(201);
  });
});
