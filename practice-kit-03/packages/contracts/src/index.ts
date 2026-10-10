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

export const UserListResponse = z.array(User);
export type UserListResponse = z.infer<typeof UserListResponse>;

// ── 투표 ──────────────────────────────────────────────────
export const POLL_MESSAGES = {
  titleRequired: "제목을 입력하세요",
  titleTooLong: "제목은 50자 이하로 입력하세요",
  candidateCount: "후보는 2개 이상 5개 이하로 입력하세요",
  candidateDuplicate: "같은 후보 시간이 중복되었습니다",
  candidateInvalid: "후보 날짜와 시각을 선택하세요",
  slotUnit: "후보 시각은 30분 단위로 선택하세요",
  choiceRequired: "가능한 시간을 하나 이상 선택하세요",
} as const;

function isOnSlot(iso: string): boolean {
  const d = new Date(iso);
  return d.getUTCSeconds() === 0 && d.getUTCMilliseconds() === 0 && d.getUTCMinutes() % 30 === 0;
}

const CandidateInput = z.object({
  startsAt: z.iso
    .datetime({ offset: true, error: POLL_MESSAGES.candidateInvalid })
    .refine(isOnSlot, POLL_MESSAGES.slotUnit),
});

export const CreatePollRequest = z.object({
  title: z
    .string({ error: POLL_MESSAGES.titleRequired })
    .trim()
    .min(1, POLL_MESSAGES.titleRequired)
    .max(50, POLL_MESSAGES.titleTooLong),
  candidates: z
    .array(CandidateInput, { error: POLL_MESSAGES.candidateCount })
    .min(2, POLL_MESSAGES.candidateCount)
    .max(5, POLL_MESSAGES.candidateCount)
    // 같은 순간이면 표기(+09:00 / Z)가 달라도 중복으로 본다.
    .refine(
      (list) => new Set(list.map((c) => new Date(c.startsAt).getTime())).size === list.length,
      POLL_MESSAGES.candidateDuplicate,
    ),
});
export type CreatePollRequest = z.infer<typeof CreatePollRequest>;

export const PollStatus = z.enum(["open", "confirmed"]);
export type PollStatus = z.infer<typeof PollStatus>;

export const Poll = z.object({
  id: z.string(),
  title: z.string(),
  status: PollStatus,
  createdBy: z.string(),
  createdByName: z.string(),
  confirmedCandidateId: z.string().nullable(),
});
export type Poll = z.infer<typeof Poll>;

export const PollListResponse = z.array(Poll);
export type PollListResponse = z.infer<typeof PollListResponse>;

export const Candidate = z.object({ id: z.string(), startsAt: z.string() });
export type Candidate = z.infer<typeof Candidate>;

export const PollCreated = Poll.extend({ candidates: z.array(Candidate) });
export type PollCreated = z.infer<typeof PollCreated>;
