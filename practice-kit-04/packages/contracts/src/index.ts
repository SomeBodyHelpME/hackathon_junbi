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
