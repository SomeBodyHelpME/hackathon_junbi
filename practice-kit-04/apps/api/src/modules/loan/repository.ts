import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { EXTEND_DAYS, LOAN_DAYS, LOAN_LIMIT, type Loan } from "@kit/contracts";
import { db } from "../../db/client.js";
import { books, loans, users } from "../../db/schema.js";
import { addDays, seoulDateOf } from "./due.js";

const loanFields = {
  id: loans.id,
  bookId: loans.bookId,
  bookTitle: books.title,
  borrowedOn: loans.borrowedOn,
  dueOn: loans.dueOn,
  extended: loans.extended,
  returnedAt: loans.returnedAt,
};

function loanQuery() {
  return db.select(loanFields).from(loans).innerJoin(books, eq(loans.bookId, books.id));
}

const toDto = (row: Omit<Loan, "returnedAt"> & { returnedAt: Date | null }): Loan => ({
  ...row,
  returnedAt: row.returnedAt?.toISOString() ?? null,
});

export async function findLoan(id: string): Promise<Loan | undefined> {
  const [row] = await loanQuery().where(eq(loans.id, id));
  return row && toDto(row);
}

export async function listActiveLoans(userId: string): Promise<Loan[]> {
  const rows = await loanQuery()
    .where(and(eq(loans.userId, userId), isNull(loans.returnedAt)))
    .orderBy(asc(loans.createdAt));
  return rows.map(toDto);
}

export type BorrowFailure = "book_not_found" | "limit" | "already_borrowed" | "out_of_stock";
export class BorrowError extends Error {
  constructor(public readonly reason: BorrowFailure) {
    super(reason);
  }
}

// 대여 트랜잭션.
// 1) 사용자 행 FOR UPDATE → 같은 사람의 동시 대여를 줄 세워 한도(2권)를 지킨다.
// 2) 재고는 조건부 UPDATE(available > 0)로 원자적으로 줄인다 → 마지막 1권은 한 명만 성공.
//    CHECK(0 ≤ available ≤ total)가 최종 방어선.
// 3) 같은 책 중복 대여는 부분 유니크 인덱스(returned_at IS NULL)도 막는다.
export async function borrow(userId: string, bookId: string, now = new Date()): Promise<Loan> {
  const id = await db.transaction(async (tx) => {
    const [book] = await tx.select({ id: books.id }).from(books).where(eq(books.id, bookId));
    if (!book) throw new BorrowError("book_not_found");

    await tx.select({ id: users.id }).from(users).where(eq(users.id, userId)).for("update");

    const active = await tx
      .select({ bookId: loans.bookId })
      .from(loans)
      .where(and(eq(loans.userId, userId), isNull(loans.returnedAt)));
    if (active.some((l) => l.bookId === bookId)) throw new BorrowError("already_borrowed");
    if (active.length >= LOAN_LIMIT) throw new BorrowError("limit");

    const taken = await tx
      .update(books)
      .set({ availableCopies: sql`${books.availableCopies} - 1` })
      .where(and(eq(books.id, bookId), sql`${books.availableCopies} > 0`))
      .returning({ id: books.id });
    if (taken.length === 0) throw new BorrowError("out_of_stock");

    const borrowedOn = seoulDateOf(now);
    const [loan] = await tx
      .insert(loans)
      .values({ userId, bookId, borrowedOn, dueOn: addDays(borrowedOn, LOAN_DAYS) })
      .returning({ id: loans.id });
    return loan.id;
  });
  return (await findLoan(id))!;
}

export type LoanActionResult = "ok" | "not_found" | "forbidden" | "already_returned" | "already_extended";

// 대여 행을 FOR UPDATE로 잠그고 소유자·상태를 확인한다.
// 같은 대여에 대한 반납·연장이 동시에 와도 한 줄로 처리된다.
async function lockOwnedActiveLoan(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  loanId: string,
  userId: string,
) {
  const [loan] = await tx.select().from(loans).where(eq(loans.id, loanId)).for("update");
  if (!loan) return { result: "not_found" as const };
  if (loan.userId !== userId) return { result: "forbidden" as const };
  if (loan.returnedAt) return { result: "already_returned" as const };
  return { loan };
}

// 반납: 인증 다음 순서는 존재(404) → 본인(403) → 이미 반납(409). 반납 표시와 재고 복구를 한 트랜잭션으로.
export async function returnLoan(loanId: string, userId: string): Promise<LoanActionResult> {
  return db.transaction(async (tx) => {
    const locked = await lockOwnedActiveLoan(tx, loanId, userId);
    if (!("loan" in locked)) return locked.result;

    await tx.update(loans).set({ returnedAt: new Date() }).where(eq(loans.id, loanId));
    await tx
      .update(books)
      .set({ availableCopies: sql`${books.availableCopies} + 1` })
      .where(eq(books.id, locked.loan!.bookId));
    return "ok";
  });
}

// 연장: 존재(404) → 본인(403) → 이미 반납(409) → 이미 연장(409) → 기존 기한 + 7일.
// 대여 행 잠금으로 동시 연장도 1회만 반영된다. 기한은 서버가 계산한다.
export async function extendLoan(
  loanId: string,
  userId: string,
): Promise<{ result: LoanActionResult; loan?: Loan }> {
  const result = await db.transaction(async (tx) => {
    const locked = await lockOwnedActiveLoan(tx, loanId, userId);
    if (!("loan" in locked)) return locked.result;
    if (locked.loan!.extended) return "already_extended" as const;

    await tx
      .update(loans)
      .set({ extended: true, dueOn: addDays(locked.loan!.dueOn, EXTEND_DAYS) })
      .where(eq(loans.id, loanId));
    return "ok" as const;
  });
  return result === "ok" ? { result, loan: await findLoan(loanId) } : { result };
}
