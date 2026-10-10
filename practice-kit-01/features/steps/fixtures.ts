import type { APIResponse } from "@playwright/test";
import { createBdd, test as base } from "playwright-bdd";

// 시나리오 하나 동안만 유지되는 메모장. Step 사이에 값을 넘길 때 쓴다.
export type ScenarioContext = {
  // 사전 조건으로 만든 예약: 제목 → id
  reservationIds: Map<string, string>;
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
    await use({ reservationIds: new Map(), lastResponse: null });
  },
});

export const { Given, When, Then, Before } = createBdd(test);

export const API_URL = process.env.API_URL ?? "http://localhost:4000";

// 시드 데이터(PRD 3장). .feature에는 이름을 쓰고, API에는 id를 보낸다.
const SEED_USERS: Record<string, string> = {
  상은: "u-sangeun",
  관응: "u-gwaneung",
};

const SEED_ROOMS: Record<string, string> = {
  한라: "r-1",
  백두: "r-2",
  지리: "r-3",
};

export function userIdOf(name: string): string {
  const id = SEED_USERS[name];
  if (!id) throw new Error(`시드에 없는 사용자: ${name}`);
  return id;
}

export function roomIdOf(name: string): string {
  const id = SEED_ROOMS[name];
  if (!id) throw new Error(`시드에 없는 회의실: ${name}`);
  return id;
}

// 화면은 Asia/Seoul 기준(PRD 6장). "2099-12-01" + "10:00" → "2099-12-01T10:00:00+09:00"
export function toSeoulIso(date: string, time: string): string {
  return `${date}T${time}:00+09:00`;
}
