import type { APIResponse } from "@playwright/test";
import { createBdd, test as base } from "playwright-bdd";

// 시나리오 하나 동안만 유지되는 메모장. Step 사이에 값을 넘길 때 쓴다.
export type ScenarioContext = {
  // 사전 조건으로 만든 투표: 제목 → { id, 후보 "YYYY-MM-DD HH:MM" → 후보 id }
  polls: Map<string, { id: string; candidates: Map<string, string> }>;
  // "API로 직접 요청한다" Step의 응답. 다음 Then Step이 검증한다.
  lastResponse: CapturedResponse | null;
};

// 요청 컨텍스트를 닫은 뒤에도 검증할 수 있도록 상태와 본문만 꺼내 둔다.
export type CapturedResponse = { status: number; body: unknown };

export async function capture(res: APIResponse): Promise<CapturedResponse> {
  const text = await res.text();
  let body: unknown = text;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    // JSON이 아니면 원문 그대로 둔다.
  }
  return { status: res.status(), body };
}

export const test = base.extend<{ ctx: ScenarioContext }>({
  ctx: async ({}, use) => {
    await use({ polls: new Map(), lastResponse: null });
  },
});

export const { Given, When, Then, Before } = createBdd(test);

export const API_URL = process.env.API_URL ?? "http://localhost:4000";

// 시드 데이터(PRD 3장). .feature에는 이름을 쓰고, API에는 id를 보낸다.
const SEED_USERS: Record<string, string> = {
  상은: "u-sangeun",
  관응: "u-gwaneung",
  병욱: "u-byeongwook",
};

export function userIdOf(name: string): string {
  const id = SEED_USERS[name];
  if (!id) throw new Error(`시드에 없는 사용자: ${name}`);
  return id;
}

// 화면은 Asia/Seoul 기준(PRD 7장).
// "2099-12-01" + "10:00" → "2099-12-01T10:00:00+09:00"
export function toSeoulIso(date: string, time: string): string {
  return `${date}T${time}:00+09:00`;
}

// "2099-12-01 10:00" → "2099-12-01T10:00:00+09:00"
export function labelToIso(label: string): string {
  const [date, time] = label.trim().split(" ");
  return toSeoulIso(date, time);
}

const labelFmt = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

// ISO → "2099-12-01 10:00"
export function isoToLabel(iso: string): string {
  return labelFmt.format(new Date(iso));
}

export function pollOf(ctx: ScenarioContext, title: string) {
  const poll = ctx.polls.get(title);
  if (!poll) throw new Error(`사전 조건에서 "${title}" 투표를 만들지 않았습니다`);
  return poll;
}

export function candidateIdOf(ctx: ScenarioContext, pollTitle: string, label: string): string {
  const id = pollOf(ctx, pollTitle).candidates.get(label);
  if (!id) throw new Error(`"${pollTitle}" 투표에 "${label}" 후보가 없습니다`);
  return id;
}
