import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { eq, inArray, like, sql } from "drizzle-orm";
import { buildApp } from "../../app.js";
import { db, pool } from "../../db/client.js";
import { books, loans, users } from "../../db/schema.js";

// 통합 테스트: 실제 PostgreSQL 필요. 대여 기록을 지우고 재고를 되돌린다.
// 동시 대여 테스트용 임시 사용자 u-t0 ~ u-t9를 만들고 끝나면 지운다.
let app: FastifyInstance;
const TEMP_USERS = Array.from({ length: 10 }, (_, i) => ({ id: `u-t${i}`, name: `테스트${i}` }));

async function resetLoans() {
  await db.delete(loans);
  await db.update(books).set({ availableCopies: sql`${books.totalCopies}` });
}

beforeAll(async () => {
  await db.insert(users).values(TEMP_USERS).onConflictDoNothing();
});

beforeEach(async () => {
  await resetLoans();
  app ??= await buildApp();
});

afterAll(async () => {
  await resetLoans();
  await db.delete(users).where(like(users.id, "u-t%"));
  await app?.close();
  await pool.end();
});

const as = (userId: string) => ({ uid: app.signCookie(userId) });
const borrow = (userId: string, bookId: string) =>
  app.inject({ method: "POST", url: "/api/loans", cookies: as(userId), payload: { bookId } });
const available = async (bookId: string) =>
  (await db.select().from(books).where(eq(books.id, bookId)))[0].availableCopies;

describe("대여 (REQ-01)", () => {
  it("대여하면 남은 권수가 줄고 내 대여에 나온다 (AC-01)", async () => {
    const res = await borrow("u-sangeun", "b-1");
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ bookId: "b-1", bookTitle: "클린 코드", extended: false, returnedAt: null });
    expect(await available("b-1")).toBe(1);
    const mine = await app.inject({ method: "GET", url: "/api/loans?mine=true", cookies: as("u-sangeun") });
    expect(mine.json().map((l: { bookId: string }) => l.bookId)).toEqual(["b-1"]);
  });

  it("재고가 0이면 409 OUT_OF_STOCK (AC-02)", async () => {
    await borrow("u-gwaneung", "b-2");
    const res = await borrow("u-sangeun", "b-2");
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe("OUT_OF_STOCK");
  });

  it("같은 책을 또 빌리면 409 ALREADY_BORROWED, 재고 그대로 (AC-03)", async () => {
    await borrow("u-sangeun", "b-1");
    const res = await borrow("u-sangeun", "b-1");
    expect(res.statusCode).toBe(409);
    expect(res.json()).toEqual({ error: { code: "ALREADY_BORROWED", message: "이미 대여 중인 도서입니다" } });
    expect(await available("b-1")).toBe(1);
  });

  it("2권 대여 중이면 409 LOAN_LIMIT_EXCEEDED, 재고 그대로 (AC-04)", async () => {
    await borrow("u-sangeun", "b-1");
    await borrow("u-sangeun", "b-2");
    const res = await borrow("u-sangeun", "b-3");
    expect(res.statusCode).toBe(409);
    expect(res.json()).toEqual({ error: { code: "LOAN_LIMIT_EXCEEDED", message: "대여 한도(2권)를 초과했습니다" } });
    expect(await available("b-3")).toBe(1);
  });

  it("없는 도서는 404", async () => {
    expect((await borrow("u-sangeun", "b-999")).statusCode).toBe(404);
  });
});

describe("동시 대여", () => {
  it("남은 1권을 10명이 동시에 빌려도 1명만 성공하고 재고는 0", async () => {
    const results = await Promise.all(TEMP_USERS.map((u) => borrow(u.id, "b-2")));
    const statuses = results.map((r) => r.statusCode);
    expect(statuses.filter((s) => s === 201)).toHaveLength(1);
    expect(statuses.filter((s) => s === 409)).toHaveLength(9);
    expect(await available("b-2")).toBe(0);
    expect(await db.select().from(loans).where(eq(loans.bookId, "b-2"))).toHaveLength(1);
  });

  it("한 사람이 3권을 동시에 빌려도 한도 2권을 넘지 않는다", async () => {
    const results = await Promise.all(["b-1", "b-2", "b-3"].map((b) => borrow("u-sangeun", b)));
    expect(results.filter((r) => r.statusCode === 201)).toHaveLength(2);
    expect(results.filter((r) => r.statusCode === 409).map((r) => r.json().error.code)).toEqual(["LOAN_LIMIT_EXCEEDED"]);
    expect(await db.select().from(loans).where(eq(loans.userId, "u-sangeun"))).toHaveLength(2);
  });

  it("같은 사람이 같은 책을 동시에 5번 빌려도 1건만 생성된다", async () => {
    const results = await Promise.all(Array.from({ length: 5 }, () => borrow("u-sangeun", "b-1")));
    expect(results.filter((r) => r.statusCode === 201)).toHaveLength(1);
    expect(await available("b-1")).toBe(1);
  });
});

describe("DB 최종 방어선", () => {
  it("재고는 0 미만이 될 수 없다 (CHECK)", async () => {
    await expect(db.update(books).set({ availableCopies: -1 }).where(eq(books.id, "b-2"))).rejects.toThrow();
  });

  it("같은 사람이 같은 책을 대여 중으로 두 번 가질 수 없다 (부분 유니크 인덱스)", async () => {
    const row = { userId: "u-sangeun", bookId: "b-1", borrowedOn: "2099-12-01", dueOn: "2099-12-15" };
    await db.insert(loans).values(row);
    await expect(db.insert(loans).values(row)).rejects.toThrow();
    // 반납된 기록과는 공존할 수 있다
    await db.update(loans).set({ returnedAt: new Date() }).where(inArray(loans.userId, ["u-sangeun"]));
    await expect(db.insert(loans).values(row)).resolves.toBeDefined();
  });
});
