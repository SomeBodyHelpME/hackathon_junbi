import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { BorrowRequest, LOAN_LIMIT, type Loan, type LoanListResponse } from "@kit/contracts";
import { AppError, parse } from "../../common/errors.js";
import { requireUser } from "../../common/auth.js";
import { hasPgCode, PG_UNIQUE_VIOLATION } from "../../common/db-errors.js";
import { borrow, BorrowError, listActiveLoans, type BorrowFailure } from "./repository.js";

const ListQuery = z.object({ mine: z.literal("true", { error: "mine=true가 필요합니다" }) });

const BORROW_ERRORS: Record<BorrowFailure, () => AppError> = {
  book_not_found: () => new AppError(404, "NOT_FOUND", "도서를 찾을 수 없습니다"),
  limit: () => new AppError(409, "LOAN_LIMIT_EXCEEDED", `대여 한도(${LOAN_LIMIT}권)를 초과했습니다`),
  already_borrowed: () => new AppError(409, "ALREADY_BORROWED", "이미 대여 중인 도서입니다"),
  out_of_stock: () => new AppError(409, "OUT_OF_STOCK", "대여 가능한 재고가 없습니다"),
};

export async function loanRoutes(app: FastifyInstance) {
  app.get("/api/loans", { preHandler: requireUser }, async (req) => {
    parse(ListQuery, req.query);
    return (await listActiveLoans(req.userId!)) satisfies LoanListResponse;
  });

  // 대여: 인증(401) → 입력 검증(400) → 도서(404) → 중복(409) → 한도(409) → 재고(409) → 201
  // 반납 기한은 서버가 계산한다 (요청의 날짜 값은 받지 않는다).
  app.post("/api/loans", { preHandler: requireUser }, async (req, reply) => {
    const { bookId } = parse(BorrowRequest, req.body);
    try {
      const loan = await borrow(req.userId!, bookId);
      return reply.status(201).send(loan satisfies Loan);
    } catch (err) {
      if (err instanceof BorrowError) throw BORROW_ERRORS[err.reason]();
      if (hasPgCode(err, PG_UNIQUE_VIOLATION)) throw BORROW_ERRORS.already_borrowed();
      throw err;
    }
  });
}
