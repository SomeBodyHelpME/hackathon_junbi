import type { APIResponse } from "@playwright/test";
import { createBdd, test as base } from "playwright-bdd";

// 시나리오 하나 동안만 유지되는 메모장. Step 사이에 값을 넘길 때 쓴다.
export type ScenarioContext = {
  // 사전 조건으로 만든 대여: "사용자|도서" → 대여 id
  loans: Map<string, string>;
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
    await use({ loans: new Map(), lastResponse: null });
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

const SEED_BOOKS: Record<string, string> = {
  "클린 코드": "b-1",
  리팩터링: "b-2",
  "도메인 주도 설계": "b-3",
};

export function userIdOf(name: string): string {
  const id = SEED_USERS[name];
  if (!id) throw new Error(`시드에 없는 사용자: ${name}`);
  return id;
}

export function bookIdOf(title: string): string {
  const id = SEED_BOOKS[title];
  if (!id) throw new Error(`시드에 없는 도서: ${title}`);
  return id;
}

export const loanKey = (userName: string, bookTitle: string) => `${userName}|${bookTitle}`;

export function loanIdOf(ctx: ScenarioContext, userName: string, bookTitle: string): string {
  const id = ctx.loans.get(loanKey(userName, bookTitle));
  if (!id) throw new Error(`사전 조건에서 "${userName}"의 "${bookTitle}" 대여를 만들지 않았습니다`);
  return id;
}

// 오늘(Asia/Seoul) + days → "YYYY-MM-DD". 서버의 반납 기한 계산과 같은 기준.
const seoulDate = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul", dateStyle: "short" });

export function seoulTodayPlus(days: number): string {
  const [y, m, d] = seoulDate.format(new Date()).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}
