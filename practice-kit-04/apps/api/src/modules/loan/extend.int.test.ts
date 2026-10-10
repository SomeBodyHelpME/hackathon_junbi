import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { eq, sql } from "drizzle-orm";
import { buildApp } from "../../app.js";
import { db, pool } from "../../db/client.js";
import { books, loans } from "../../db/schema.js";
import { addDays, seoulDateOf } from "./due.js";

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
const today = () => seoulDateOf(new Date());

async function borrow(userId: string, bookId = "b-1") {
  const res = await app.inject({ method: "POST", url: "/api/loans", cookies: as(userId), payload: { bookId } });
  return res.json() as { id: string; borrowedOn: string; dueOn: string };
}
const extend = (loanId: string, userId: string) =>
  app.inject({ method: "POST", url: `/api/loans/${loanId}/extend`, cookies: as(userId) });
const loanRow = async (id: string) => (await db.select().from(loans).where(eq(loans.id, id)))[0];

describe("반납 기한과 연장 (REQ-03)", () => {
  it("대여하면 기한은 서버의 오늘(서울) + 14일 (AC-09)", async () => {
    const loan = await borrow("u-sangeun");
    expect(loan.borrowedOn).toBe(today());
    expect(loan.dueOn).toBe(addDays(today(), 14));
  });

  it("연장하면 기존 기한 + 7일, extended=true (AC-10)", async () => {
    const loan = await borrow("u-sangeun");
    const res = await extend(loan.id, "u-sangeun");
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ dueOn: addDays(today(), 21), extended: true });
  });

  it("두 번째 연장은 409 ALREADY_EXTENDED, 기한 그대로 (AC-11)", async () => {
    const loan = await borrow("u-sangeun");
    await extend(loan.id, "u-sangeun");
    const res = await extend(loan.id, "u-sangeun");
    expect(res.statusCode).toBe(409);
    expect(res.json()).toEqual({ error: { code: "ALREADY_EXTENDED", message: "연장은 1회만 가능합니다" } });
    expect((await loanRow(loan.id)).dueOn).toBe(addDays(today(), 21));
  });

  it("타인 대여 연장은 403, 기한 그대로 (AC-12)", async () => {
    const loan = await borrow("u-gwaneung");
    const res = await extend(loan.id, "u-sangeun");
    expect(res.statusCode).toBe(403);
    expect(res.json().error.code).toBe("FORBIDDEN");
    expect(await loanRow(loan.id)).toMatchObject({ dueOn: addDays(today(), 14), extended: false });
  });

  it("반납된 대여는 연장할 수 없다 (409 ALREADY_RETURNED)", async () => {
    const loan = await borrow("u-sangeun");
    await app.inject({ method: "POST", url: `/api/loans/${loan.id}/return`, cookies: as("u-sangeun") });
    expect((await extend(loan.id, "u-sangeun")).json().error.code).toBe("ALREADY_RETURNED");
  });

  it("동시에 5번 연장해도 1번만 반영된다 (+7일 한 번)", async () => {
    const loan = await borrow("u-sangeun");
    const results = await Promise.all(Array.from({ length: 5 }, () => extend(loan.id, "u-sangeun")));
    expect(results.filter((r) => r.statusCode === 200)).toHaveLength(1);
    expect((await loanRow(loan.id)).dueOn).toBe(addDays(today(), 21));
  });
});
