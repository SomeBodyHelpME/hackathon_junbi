import type { APIResponse } from "@playwright/test";
import { createBdd, test as base } from "playwright-bdd";

// 시나리오 하나 동안만 유지되는 메모장. Step 사이에 값을 넘길 때 쓴다.
export type ScenarioContext = {
  // 사전 조건으로 만든 모집: 제목 → id
  rounds: Map<string, string>;
  // 사전 조건으로 만든 주문: 주문자 이름 → id (모집당 1인 1주문)
  orders: Map<string, string>;
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
    await use({ rounds: new Map(), orders: new Map(), lastResponse: null });
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

const SEED_MENUS: Record<string, string> = {
  김치찌개: "m-1",
  된장찌개: "m-2",
  제육볶음: "m-3",
};

export function userIdOf(name: string): string {
  const id = SEED_USERS[name];
  if (!id) throw new Error(`시드에 없는 사용자: ${name}`);
  return id;
}

export function menuIdOf(name: string): string {
  const id = SEED_MENUS[name];
  if (!id) throw new Error(`시드에 없는 메뉴: ${name}`);
  return id;
}

export function roundIdOf(ctx: ScenarioContext, title: string): string {
  const id = ctx.rounds.get(title);
  if (!id) throw new Error(`사전 조건에서 "${title}" 모집을 만들지 않았습니다`);
  return id;
}

export function orderIdOf(ctx: ScenarioContext, userName: string): string {
  const id = ctx.orders.get(userName);
  if (!id) throw new Error(`사전 조건에서 "${userName}"의 주문을 만들지 않았습니다`);
  return id;
}
