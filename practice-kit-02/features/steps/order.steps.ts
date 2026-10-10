import { expect, type APIRequestContext, type Page, type PlaywrightWorkerArgs } from "@playwright/test";
import type { DataTable } from "playwright-bdd";
import {
  API_URL,
  Given,
  Then,
  When,
  capture,
  menuIdOf,
  orderIdOf,
  roundIdOf,
  userIdOf,
  type ScenarioContext,
} from "./fixtures";

/*
 * 이 파일이 정하는 화면/API 계약 (REQ-01~03 구현이 따라야 한다)
 *
 * [모집 화면] /rounds
 *   - 모집 개설 폼: 라벨 "날짜"(date), "제목"(text), 버튼 "모집 열기"
 *   - 모집 목록: <ul aria-label="모집">, 항목은 제목 링크 → /rounds/:id
 *
 * [모집 상세] /rounds/:id   (데이터를 다 불러온 뒤에만 아래 요소를 그린다)
 *   - 상태: data-testid="round-status" ("모집 중" | "마감")
 *   - 버튼 "마감하기": 개설자 + 모집 중일 때만
 *   - 주문 양식 <form aria-label="주문">: 라벨 "메뉴"(select, 옵션=메뉴 이름), "수량"(number),
 *     "요청사항"(text), 버튼 "주문하기". 모집 중일 때만 표시
 *   - 오류: role="alert"
 *   - 주문 현황 <ul aria-label="주문 현황">: 항목 텍스트에 주문자 이름·메뉴·"N개", 본인 주문에만 "취소" 버튼
 *   - 취합표 <table aria-label="취합표">: tbody 행 = 메뉴 | 수량 | 금액("27,000원")
 *   - 총액: data-testid="summary-total" ("37,000원")
 *
 * [API]
 *   - POST   /api/rounds { date, title } → 201 { id, ... }
 *   - GET    /api/rounds/:id → { id, status: "open"|"closed", orders: [{ id, userName, ... }], summary }
 *   - POST   /api/rounds/:id/close → 204 / 403 / 409
 *   - POST   /api/rounds/:id/orders { menuId, quantity, memo? } → 201 { id, ... } / 409
 *   - DELETE /api/orders/:id → 204 / 401 / 403 / 404 / 409
 */

// ── 사전 조건 (API, 브라우저와 분리된 요청 컨텍스트) ─────────────

// 해당 사용자로 로그인한 별도 요청 컨텍스트에서 fn을 실행한다. 브라우저 쿠키는 바뀌지 않는다.
type Playwright = PlaywrightWorkerArgs["playwright"];

async function asUser<T>(
  playwright: Playwright,
  userName: string,
  fn: (api: APIRequestContext) => Promise<T>,
): Promise<T> {
  const api = await playwright.request.newContext({ baseURL: API_URL });
  try {
    const login = await api.post("/api/auth/fake-login", { data: { userId: userIdOf(userName) } });
    expect(login.status(), `"${userName}" 로그인 실패`).toBe(200);
    return await fn(api);
  } finally {
    await api.dispose();
  }
}

Given(
  "{string}이 {string} {string} 모집을 열어 두었다",
  async ({ playwright, ctx }, userName: string, date: string, title: string) => {
    await asUser(playwright, userName, async (api) => {
      const res = await api.post("/api/rounds", { data: { date, title } });
      expect(res.status(), `사전 조건 모집 개설 실패: ${await res.text()}`).toBe(201);
      ctx.rounds.set(title, (await res.json()).id);
    });
  },
);

async function placeOrder(
  playwright: Playwright,
  ctx: ScenarioContext,
  userName: string,
  roundTitle: string,
  menuName: string,
  quantity: number,
) {
  const roundId = roundIdOf(ctx, roundTitle);
  await asUser(playwright, userName, async (api) => {
    const res = await api.post(`/api/rounds/${roundId}/orders`, {
      data: { menuId: menuIdOf(menuName), quantity },
    });
    expect(res.status(), `사전 조건 주문 실패: ${await res.text()}`).toBe(201);
    ctx.orders.set(userName, (await res.json()).id);
  });
}

Given(
  "{string}이 {string} 모집에 {string} {int}개를 주문해 두었다",
  async ({ playwright, ctx }, userName: string, roundTitle: string, menuName: string, quantity: number) => {
    await placeOrder(playwright, ctx, userName, roundTitle, menuName, quantity);
  },
);

Given(
  "다음 주문이 {string} 모집에 들어와 있다",
  async ({ playwright, ctx }, roundTitle: string, table: DataTable) => {
    for (const row of table.hashes()) {
      await placeOrder(playwright, ctx, row["사용자"], roundTitle, row["메뉴"], Number(row["수량"]));
    }
  },
);

Given(
  "{string}이 {string} 모집을 마감해 두었다",
  async ({ playwright, ctx }, userName: string, roundTitle: string) => {
    const roundId = roundIdOf(ctx, roundTitle);
    await asUser(playwright, userName, async (api) => {
      const res = await api.post(`/api/rounds/${roundId}/close`);
      expect(res.status(), `사전 조건 마감 실패: ${await res.text()}`).toBe(204);
    });
  },
);

// ── 모집 화면 ───────────────────────────────────────────

Given("모집 화면에 접속한다", async ({ page }) => {
  await page.goto("/rounds");
});

When("{string} {string} 모집을 연다", async ({ page }, date: string, title: string) => {
  await page.getByLabel("날짜").fill(date);
  await page.getByLabel("제목").fill(title);
  await page.getByRole("button", { name: "모집 열기" }).click();
});

Then("{string} 목록에 {string}이 표시된다", async ({ page }, listName: string, item: string) => {
  const list = page.getByRole("list", { name: listName });
  await expect(list.getByRole("listitem").filter({ hasText: item })).toHaveCount(1);
});

// ── 모집 상세 ───────────────────────────────────────────

Given("{string} 모집 화면에 접속한다", async ({ page, ctx }, roundTitle: string) => {
  await page.goto(`/rounds/${roundIdOf(ctx, roundTitle)}`);
});

When("{string} {int}개를 주문한다", async ({ page }, menuName: string, quantity: number) => {
  const form = page.getByRole("form", { name: "주문" });
  await form.getByLabel("메뉴").selectOption({ label: menuName });
  await form.getByLabel("수량").fill(String(quantity));
  await form.getByRole("button", { name: "주문하기" }).click();
});

function orderItem(page: Page, listName: string, userName: string) {
  return page
    .getByRole("list", { name: listName })
    .getByRole("listitem")
    .filter({ hasText: userName });
}

async function expectOrderShown(
  page: Page,
  listName: string,
  userName: string,
  menuName: string,
  quantity: number,
) {
  const item = orderItem(page, listName, userName);
  await expect(item).toHaveCount(1);
  await expect(item).toContainText(menuName);
  await expect(item).toContainText(`${quantity}개`);
}

Then(
  "{string}에 {string}의 {string} {int}개 주문이 표시된다",
  async ({ page }, listName: string, userName: string, menuName: string, quantity: number) => {
    await expectOrderShown(page, listName, userName, menuName, quantity);
  },
);

Then(
  "페이지를 새로고침해도 {string}에 {string}의 {string} {int}개 주문이 표시된다",
  async ({ page }, listName: string, userName: string, menuName: string, quantity: number) => {
    await page.reload();
    await expectOrderShown(page, listName, userName, menuName, quantity);
  },
);

// 부정 검증 전 가드: 목록이 로딩을 마치고 그려졌는지(toBeAttached) 먼저 확인한다.
Then("{string}은 비어 있다", async ({ page }, listName: string) => {
  const list = page.getByRole("list", { name: listName });
  await expect(list).toBeAttached();
  await expect(list.getByRole("listitem")).toHaveCount(0);
});

Then(
  "{string}에 {string}의 주문이 표시되지 않는다",
  async ({ page }, listName: string, userName: string) => {
    await expect(page.getByRole("list", { name: listName })).toBeAttached();
    await expect(orderItem(page, listName, userName)).toHaveCount(0);
  },
);

Then(
  "페이지를 새로고침해도 {string}에 {string}의 주문이 표시되지 않는다",
  async ({ page }, listName: string, userName: string) => {
    await page.reload();
    await expect(page.getByRole("list", { name: listName })).toBeAttached();
    await expect(orderItem(page, listName, userName)).toHaveCount(0);
  },
);

When(
  "{string}에서 {string}의 주문을 취소한다",
  async ({ page }, listName: string, userName: string) => {
    await orderItem(page, listName, userName).getByRole("button", { name: "취소" }).click();
  },
);

Then("{string}의 주문에는 취소 버튼이 없다", async ({ page }, userName: string) => {
  const item = orderItem(page, "주문 현황", userName);
  // 주문이 실제로 보이는 상태에서 버튼이 없는지 확인한다 (빈 화면에서 통과하는 것 방지).
  await expect(item).toBeVisible();
  await expect(item.getByRole("button", { name: "취소" })).toHaveCount(0);
});

// ── 마감 · 취합 ─────────────────────────────────────────

When("모집을 마감한다", async ({ page }) => {
  await page.getByRole("button", { name: "마감하기" }).click();
});

Then("모집 상태가 {string}으로 표시된다", async ({ page }, status: string) => {
  await expect(page.getByTestId("round-status")).toHaveText(status);
});

Then("주문 양식이 표시되지 않는다", async ({ page }) => {
  // 상세 화면이 그려진 상태에서 확인한다.
  await expect(page.getByTestId("round-status")).toBeVisible();
  await expect(page.getByRole("form", { name: "주문" })).toHaveCount(0);
});

Then("마감 버튼이 없다", async ({ page }) => {
  await expect(page.getByTestId("round-status")).toBeVisible();
  await expect(page.getByRole("button", { name: "마감하기" })).toHaveCount(0);
});

Then("취합표에 다음과 같이 표시된다", async ({ page }, table: DataTable) => {
  const expected = table.rows(); // 헤더 제외
  const rows = page.getByRole("table", { name: "취합표" }).locator("tbody tr");
  await expect(rows).toHaveCount(expected.length);
  for (const [i, cells] of expected.entries()) {
    await expect(rows.nth(i).locator("td")).toHaveText(cells);
  }
});

Then("취합 총액은 {string}이다", async ({ page }, total: string) => {
  await expect(page.getByTestId("summary-total")).toHaveText(total);
});

// ── API 직접 요청 ───────────────────────────────────────

When(
  "{string} 모집에 {string} {int}개 주문을 API로 직접 요청한다",
  async ({ page, ctx }, roundTitle: string, menuName: string, quantity: number) => {
    ctx.lastResponse = await capture(
      await page.request.post(`${API_URL}/api/rounds/${roundIdOf(ctx, roundTitle)}/orders`, {
        data: { menuId: menuIdOf(menuName), quantity },
      }),
    );
  },
);

When(
  "로그인하지 않은 상태로 {string} 모집에 {string} {int}개 주문을 API로 직접 요청한다",
  async ({ playwright, ctx }, roundTitle: string, menuName: string, quantity: number) => {
    const api = await playwright.request.newContext({ baseURL: API_URL });
    try {
      ctx.lastResponse = await capture(
        await api.post(`/api/rounds/${roundIdOf(ctx, roundTitle)}/orders`, {
          data: { menuId: menuIdOf(menuName), quantity },
        }),
      );
    } finally {
      await api.dispose();
    }
  },
);

When("{string} 모집의 마감을 API로 직접 요청한다", async ({ page, ctx }, roundTitle: string) => {
  ctx.lastResponse = await capture(
    await page.request.post(`${API_URL}/api/rounds/${roundIdOf(ctx, roundTitle)}/close`),
  );
});

When("{string}의 주문 취소를 API로 직접 요청한다", async ({ page, ctx }, userName: string) => {
  ctx.lastResponse = await capture(
    await page.request.delete(`${API_URL}/api/orders/${orderIdOf(ctx, userName)}`),
  );
});

// 화면과 무관하게 데이터 자체가 남아 있는지 API로 확인한다.
async function fetchRound(page: Page, ctx: ScenarioContext) {
  const [roundId] = [...ctx.rounds.values()];
  const res = await page.request.get(`${API_URL}/api/rounds/${roundId}`);
  expect(res.status()).toBe(200);
  return (await res.json()) as { status: string; orders: Array<{ id: string }> };
}

Then("{string}의 주문은 그대로 유지된다", async ({ page, ctx }, userName: string) => {
  const round = await fetchRound(page, ctx);
  expect(round.orders.map((o) => o.id)).toContain(orderIdOf(ctx, userName));
});

Then("모집 상태는 {string}으로 유지된다", async ({ page, ctx }, status: string) => {
  const round = await fetchRound(page, ctx);
  expect(round.status).toBe(status === "모집 중" ? "open" : "closed");
});
