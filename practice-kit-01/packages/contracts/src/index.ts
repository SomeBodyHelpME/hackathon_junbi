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

// ── 예약 ──────────────────────────────────────────────────
export const TIME_SLOT_MINUTES = 30;

export const RESERVATION_MESSAGES = {
  titleRequired: "제목을 입력하세요",
  titleTooLong: "제목은 100자 이하로 입력하세요",
  roomRequired: "회의실을 선택하세요",
  dateTimeRequired: "날짜와 시각을 선택하세요",
  endAfterStart: "종료 시각은 시작 시각 이후여야 합니다",
  slotUnit: "시각은 30분 단위로 선택하세요",
} as const;

const isoDateTime = z.iso.datetime({ offset: true, error: RESERVATION_MESSAGES.dateTimeRequired });

function isOnSlot(iso: string): boolean {
  const d = new Date(iso);
  return d.getUTCSeconds() === 0 && d.getUTCMilliseconds() === 0 && d.getUTCMinutes() % TIME_SLOT_MINUTES === 0;
}

// FE/BE가 같은 규칙으로 검증한다. 백엔드 검증이 진짜 방어선이고, 프론트는 UX 보조.
export const CreateReservationRequest = z
  .object({
    roomId: z.string({ error: RESERVATION_MESSAGES.roomRequired }).min(1, RESERVATION_MESSAGES.roomRequired),
    title: z
      .string({ error: RESERVATION_MESSAGES.titleRequired })
      .trim()
      .min(1, RESERVATION_MESSAGES.titleRequired)
      .max(100, RESERVATION_MESSAGES.titleTooLong),
    startAt: isoDateTime,
    endAt: isoDateTime,
  })
  .refine((d) => new Date(d.endAt) > new Date(d.startAt), {
    message: RESERVATION_MESSAGES.endAfterStart,
    path: ["endAt"],
  })
  .refine((d) => isOnSlot(d.startAt) && isOnSlot(d.endAt), {
    message: RESERVATION_MESSAGES.slotUnit,
    path: ["startAt"],
  });
export type CreateReservationRequest = z.infer<typeof CreateReservationRequest>;

export const Reservation = z.object({
  id: z.string(),
  roomId: z.string(),
  roomName: z.string(),
  userId: z.string(),
  userName: z.string(),
  title: z.string(),
  startAt: z.string(),
  endAt: z.string(),
});
export type Reservation = z.infer<typeof Reservation>;

export const ReservationListResponse = z.array(Reservation);
export type ReservationListResponse = z.infer<typeof ReservationListResponse>;

// 예약 조회: "내 예약" 또는 회의실·날짜(Asia/Seoul 하루)
export const ReservationListQuery = z.union([
  z.object({ mine: z.literal("true") }),
  z.object({
    roomId: z.string().min(1),
    date: z.iso.date({ error: "날짜 형식은 YYYY-MM-DD입니다" }),
  }),
]);
export type ReservationListQuery = z.infer<typeof ReservationListQuery>;
