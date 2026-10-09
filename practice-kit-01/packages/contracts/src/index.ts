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

// ── 회의실 ────────────────────────────────────────────────
export const Room = z.object({
  id: z.string(),
  name: z.string(),
  capacity: z.number().int().positive(),
});
export type Room = z.infer<typeof Room>;

export const RoomListResponse = z.array(Room);
export type RoomListResponse = z.infer<typeof RoomListResponse>;
