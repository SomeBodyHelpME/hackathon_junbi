import { expect, type APIRequestContext, type Page, type PlaywrightWorkerArgs } from "@playwright/test";
import {
  API_URL,
  Given,
  Then,
  When,
  bookIdOf,
  capture,
  loanIdOf,
  loanKey,
  seoulTodayPlus,
  userIdOf,
} from "./fixtures";

/*
 * 이 파일이 정하는 화면/API 계약 (REQ-01~03 구현이 따라야 한다)
 *
 * [도서 화면] /books   (데이터를 다 불러온 뒤에만 목록을 그린다)
 *   - 도서 목록 <ul aria-label="도서 목록">: 항목에 제목, data-testid="available"
 *     ("남은 권수 N권" | "대여 불가"), 남은 권수가 있으면 버튼 "대여"
 *   - 내 대여 <ul aria-label="내 대여">: 항목에 제목, data-testid="due-on"("YYYY-MM-DD"),
 *     버튼 "반납", 연장 전이면 버튼 "연장"
 *   - 오류 role="alert"
 *
 * [API]
 *   - POST /api/loans { bookId } → 201 { id, bookId, bookTitle, borrowedOn, dueOn, extended }
 *   - GET  /api/loans?mine=true → 내 대여 중 목록 [{ id, bookTitle, dueOn, extended, ... }]
 *   - POST /api/loans/:id/return → 204 / 401 / 403 / 404 / 409
 *   - POST /api/loans/:id/extend → 200 / 401 / 403 / 404 / 409
 */

type Playwright = PlaywrightWorkerArgs["playwright"];
type MyLoan = { id: string; bookTitle: string; dueOn: string };

// 해당 사용자로 로그인한 별도 요청 컨텍스트에서 fn을 실행한다. 브라우저 쿠키는 바뀌지 않는다.
async function asUser<T>(playwright: Playwright, userName: string, fn: (api: APIRequestContext) => Promise<T>) {
  const api = await playwright.request.newContext({ baseURL: API_URL });
  try {
    const login = await api.post("/api/auth/fake-login", { data: { userId: userIdOf(userName) } });
    expect(login.status(), `"${userName}" 로그인 실패`).toBe(200);
    return await fn(api);
  } finally {
    await api.dispose();
  }
}

async function myLoans(api: APIRequestContext): Promise<MyLoan[]> {
  const res = await api.get("/api/loans", { params: { mine: "true" } });
  expect(res.status()).toBe(200);
  return res.json();
}

// ── 사전 조건 (API) ─────────────────────────────────────

Given(
  /^"([^"]+)"이 "([^"]+)"(?:을|를) 빌려 두었다$/,
  async ({ playwright, ctx }, userName: string, bookTitle: string) => {
    await asUser(playwright, userName, async (api) => {
      const res = await api.post("/api/loans", { data: { bookId: bookIdOf(bookTitle) } });
      expect(res.status(), `사전 조건 대여 실패: ${await res.text()}`).toBe(201);
      ctx.loans.set(loanKey(userName, bookTitle), (await res.json()).id);
    });
  },
);

Given(
  /^"([^"]+)"이 "([^"]+)"(?:을|를) 반납해 두었다$/,
  async ({ playwright, ctx }, userName: string, bookTitle: string) => {
    const id = loanIdOf(ctx, userName, bookTitle);
    await asUser(playwright, userName, async (api) => {
      const res = await api.post(`/api/loans/${id}/return`);
      expect(res.status(), `사전 조건 반납 실패: ${await res.text()}`).toBe(204);
    });
  },
);

Given(
  "{string}이 {string} 대여를 연장해 두었다",
  async ({ playwright, ctx }, userName: string, bookTitle: string) => {
    const id = loanIdOf(ctx, userName, bookTitle);
    await asUser(playwright, userName, async (api) => {
      const res = await api.post(`/api/loans/${id}/extend`);
      expect(res.status(), `사전 조건 연장 실패: ${await res.text()}`).toBe(200);
    });
  },
);

// ── 도서 화면 ───────────────────────────────────────────

Given("도서 화면에 접속한다", async ({ page }) => {
  await page.goto("/books");
});

const bookItem = (page: Page, title: string) =>
  page.getByRole("list", { name: "도서 목록" }).getByRole("listitem").filter({ hasText: title });

const loanItem = (page: Page, title: string) =>
  page.getByRole("list", { name: "내 대여" }).getByRole("listitem").filter({ hasText: title });

When(/^"([^"]+)"(?:을|를) 빌린다$/, async ({ page }, title: string) => {
  await bookItem(page, title).getByRole("button", { name: "대여" }).click();
});

Then("{string}의 남은 권수는 {int}권이다", async ({ page }, title: string, count: number) => {
  await expect(bookItem(page, title).getByTestId("available")).toHaveText(`남은 권수 ${count}권`);
});

Then(/^"([^"]+)"(?:은|는) "([^"]+)"(?:으로|로) 표시된다$/, async ({ page }, title: string, label: string) => {
  await expect(bookItem(page, title).getByTestId("available")).toHaveText(label);
});

Then("{string}에는 대여 버튼이 없다", async ({ page }, title: string) => {
  const item = bookItem(page, title);
  await expect(item).toBeVisible();
  await expect(item.getByRole("button", { name: "대여" })).toHaveCount(0);
});

// ── 내 대여 ─────────────────────────────────────────────

async function expectInList(page: Page, listName: string, title: string, shown: boolean) {
  const list = page.getByRole("list", { name: listName });
  // 부정 검증 전 가드: 목록이 로딩을 마치고 그려졌는지 먼저 확인한다.
  await expect(list).toBeAttached();
  await expect(list.getByRole("listitem").filter({ hasText: title })).toHaveCount(shown ? 1 : 0);
}

Then(/^"([^"]+)" 목록에 "([^"]+)"(?:이|가) 표시된다$/, async ({ page }, listName: string, title: string) => {
  await expectInList(page, listName, title, true);
});

Then(/^"([^"]+)" 목록에 "([^"]+)"(?:이|가) 표시되지 않는다$/, async ({ page }, listName: string, title: string) => {
  await expectInList(page, listName, title, false);
});

Then(
  /^페이지를 새로고침해도 "([^"]+)" 목록에 "([^"]+)"(?:이|가) 표시된다$/,
  async ({ page }, listName: string, title: string) => {
    await page.reload();
    await expectInList(page, listName, title, true);
  },
);

Then(
  /^페이지를 새로고침해도 "([^"]+)" 목록에 "([^"]+)"(?:이|가) 표시되지 않는다$/,
  async ({ page }, listName: string, title: string) => {
    await page.reload();
    await expectInList(page, listName, title, false);
  },
);

When(/^"내 대여" 목록에서 "([^"]+)"(?:을|를) 반납한다$/, async ({ page }, title: string) => {
  await loanItem(page, title).getByRole("button", { name: "반납" }).click();
});

When(/^"내 대여" 목록에서 "([^"]+)"(?:을|를) 연장한다$/, async ({ page }, title: string) => {
  await loanItem(page, title).getByRole("button", { name: "연장" }).click();
});

Then(
  "{string} 목록의 {string} 반납 기한은 오늘부터 {int}일 뒤다",
  async ({ page }, listName: string, title: string, days: number) => {
    const item = page.getByRole("list", { name: listName }).getByRole("listitem").filter({ hasText: title });
    await expect(item.getByTestId("due-on")).toHaveText(seoulTodayPlus(days));
  },
);

Then("{string}에는 연장 버튼이 없다", async ({ page }, title: string) => {
  const item = loanItem(page, title);
  await expect(item).toBeVisible();
  await expect(item.getByRole("button", { name: "연장" })).toHaveCount(0);
});

// ── API 직접 요청 ───────────────────────────────────────

When(
  "{string}의 {string} 대여 반납을 API로 직접 요청한다",
  async ({ page, ctx }, userName: string, title: string) => {
    ctx.lastResponse = await capture(
      await page.request.post(`${API_URL}/api/loans/${loanIdOf(ctx, userName, title)}/return`),
    );
  },
);

When(
  "{string}의 {string} 대여 연장을 API로 직접 요청한다",
  async ({ page, ctx }, userName: string, title: string) => {
    ctx.lastResponse = await capture(
      await page.request.post(`${API_URL}/api/loans/${loanIdOf(ctx, userName, title)}/extend`),
    );
  },
);

When("로그인하지 않은 상태로 {string} 대여를 API로 직접 요청한다", async ({ playwright, ctx }, title: string) => {
  const api = await playwright.request.newContext({ baseURL: API_URL });
  try {
    ctx.lastResponse = await capture(await api.post("/api/loans", { data: { bookId: bookIdOf(title) } }));
  } finally {
    await api.dispose();
  }
});

// 화면과 무관하게 대여 주인의 계정으로 데이터 자체를 확인한다.
Then(
  "{string}의 {string} 대여는 그대로 유지된다",
  async ({ playwright, ctx }, userName: string, title: string) => {
    const id = loanIdOf(ctx, userName, title);
    const loans = await asUser(playwright, userName, myLoans);
    expect(loans.map((l) => l.id)).toContain(id);
  },
);

Then(
  "{string}의 {string} 반납 기한은 오늘부터 {int}일 뒤 그대로다",
  async ({ playwright, ctx }, userName: string, title: string, days: number) => {
    const id = loanIdOf(ctx, userName, title);
    const loans = await asUser(playwright, userName, myLoans);
    expect(loans.find((l) => l.id === id)?.dueOn).toBe(seoulTodayPlus(days));
  },
);
