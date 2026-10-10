import { z } from "zod";

// ── 공통 에러 응답 ─────────────────────────────────────────
// 모든 API 오류는 { error: { code, message } } 형식으로 응답한다 (PRD 6장).
export const ErrorResponse = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});
export type ErrorResponse = z.infer<typeof ErrorResponse>;

// ── 사용자 / 인증 ──────────────────────────────────────────
export const User = z.object({
  id: z.string(),
  name: z.string(),
});
export type User = z.infer<typeof User>;

export const FakeLoginRequest = z.object({
  userId: z.string().min(1),
});
export type FakeLoginRequest = z.infer<typeof FakeLoginRequest>;

// ── 도서 ──────────────────────────────────────────────────
export const Book = z.object({
  id: z.string(),
  title: z.string(),
  totalCopies: z.number().int().nonnegative(),
  availableCopies: z.number().int().nonnegative(),
});
export type Book = z.infer<typeof Book>;

export const BookListResponse = z.array(Book);
export type BookListResponse = z.infer<typeof BookListResponse>;

// ── 대여 ──────────────────────────────────────────────────
export const LOAN_LIMIT = 2;
export const LOAN_DAYS = 14;
export const EXTEND_DAYS = 7;

export const BorrowRequest = z.object({
  bookId: z.string({ error: "도서를 선택하세요" }).min(1, "도서를 선택하세요"),
});
export type BorrowRequest = z.infer<typeof BorrowRequest>;

// 날짜(borrowedOn, dueOn)는 Asia/Seoul 기준 "YYYY-MM-DD"
export const Loan = z.object({
  id: z.string(),
  bookId: z.string(),
  bookTitle: z.string(),
  borrowedOn: z.string(),
  dueOn: z.string(),
  extended: z.boolean(),
  returnedAt: z.string().nullable(),
});
export type Loan = z.infer<typeof Loan>;

export const LoanListResponse = z.array(Loan);
export type LoanListResponse = z.infer<typeof LoanListResponse>;
