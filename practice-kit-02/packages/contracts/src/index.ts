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

// ── 메뉴 ──────────────────────────────────────────────────
export const Menu = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number().int().nonnegative(),
});
export type Menu = z.infer<typeof Menu>;

export const MenuListResponse = z.array(Menu);
export type MenuListResponse = z.infer<typeof MenuListResponse>;

// ── 모집 ──────────────────────────────────────────────────
export const ROUND_MESSAGES = {
  dateRequired: "날짜를 선택하세요",
  titleRequired: "제목을 입력하세요",
  titleTooLong: "제목은 50자 이하로 입력하세요",
} as const;

export const CreateRoundRequest = z.object({
  date: z.iso.date({ error: ROUND_MESSAGES.dateRequired }),
  title: z
    .string({ error: ROUND_MESSAGES.titleRequired })
    .trim()
    .min(1, ROUND_MESSAGES.titleRequired)
    .max(50, ROUND_MESSAGES.titleTooLong),
});
export type CreateRoundRequest = z.infer<typeof CreateRoundRequest>;

export const RoundStatus = z.enum(["open", "closed"]);
export type RoundStatus = z.infer<typeof RoundStatus>;

export const Round = z.object({
  id: z.string(),
  title: z.string(),
  date: z.string(),
  status: RoundStatus,
  createdBy: z.string(),
  createdByName: z.string(),
});
export type Round = z.infer<typeof Round>;

export const RoundListResponse = z.array(Round);
export type RoundListResponse = z.infer<typeof RoundListResponse>;

// ── 주문 ──────────────────────────────────────────────────
export const ORDER_MESSAGES = {
  menuRequired: "메뉴를 선택하세요",
  quantityRange: "수량은 1개 이상 5개 이하로 입력하세요",
  memoTooLong: "요청사항은 50자 이하로 입력하세요",
} as const;

// 가격·금액 필드는 받지 않는다. 알 수 없는 키는 Zod가 제거하고, 금액은 서버가 DB 가격으로 계산한다.
export const CreateOrderRequest = z.object({
  menuId: z.string({ error: ORDER_MESSAGES.menuRequired }).min(1, ORDER_MESSAGES.menuRequired),
  quantity: z
    .number({ error: ORDER_MESSAGES.quantityRange })
    .int(ORDER_MESSAGES.quantityRange)
    .min(1, ORDER_MESSAGES.quantityRange)
    .max(5, ORDER_MESSAGES.quantityRange),
  memo: z
    .string()
    .trim()
    .max(50, ORDER_MESSAGES.memoTooLong)
    .optional()
    .transform((v) => (v ? v : undefined)),
});
export type CreateOrderRequest = z.input<typeof CreateOrderRequest>;

export const Order = z.object({
  id: z.string(),
  roundId: z.string(),
  userId: z.string(),
  userName: z.string(),
  menuId: z.string(),
  menuName: z.string(),
  quantity: z.number(),
  amount: z.number(),
  memo: z.string().nullable(),
});
export type Order = z.infer<typeof Order>;

export const RoundDetail = Round.extend({
  orders: z.array(Order),
});
export type RoundDetail = z.infer<typeof RoundDetail>;
