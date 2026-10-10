import {
  expect,
  type APIRequestContext,
  type Page,
  type PlaywrightWorkerArgs,
} from "@playwright/test";
import type { DataTable } from "playwright-bdd";
import {
  API_URL,
  Given,
  Then,
  When,
  candidateIdOf,
  capture,
  isoToLabel,
  pollOf,
  toSeoulIso,
  userIdOf,
  type ScenarioContext,
} from "./fixtures";

/*
 * 이 파일이 정하는 화면/API 계약 (REQ-01~03 구현이 따라야 한다)
 * 후보 표시 형식: "YYYY-MM-DD HH:MM" (Asia/Seoul)
 *
 * [투표 화면] /polls
 *   - 생성 폼: 라벨 "제목"(text), 후보 행 "후보 N 날짜"(date) · "후보 N 시각"(select, "HH:MM" 30분 단위),
 *     처음 1행, 버튼 "후보 추가"로 행 추가, 버튼 "투표 만들기"
 *   - 목록 <ul aria-label="투표">, 항목은 제목 링크 → /polls/:id
 *
 * [투표 상세] /polls/:id   (데이터를 다 불러온 뒤에만 아래 요소를 그린다)
 *   - 상태 data-testid="poll-status" ("투표 중" | "확정"), 확정 시간 data-testid="confirmed-time"
 *   - 응답 양식 <form aria-label="응답">: 후보마다 체크박스(라벨 = 후보 표시), 버튼 "응답하기". 투표 중일 때만
 *   - 집계 <table aria-label="집계">: tbody 행 = 후보 | 가능 인원(숫자) | (개설자·투표 중이면) 버튼 "<후보>으로 확정"
 *   - 최다 득표 <ul aria-label="최다 득표 후보">: 후보 시간순
 *   - 오류 role="alert"
 *
 * [API]
 *   - POST /api/polls { title, candidates: [{ startsAt }] } → 201 { id, candidates: [{ id, startsAt }] }
 *   - GET  /api/polls/:id → { status: "open"|"confirmed", candidates: [{ id, startsAt, count }], ... }
 *   - PUT  /api/polls/:id/response { candidateIds } → 200 / 400 / 401 / 404 / 409
 *   - POST /api/polls/:id/confirm { candidateId } → 204 / 400 / 401 / 403 / 404 / 409
 */

type Playwright = PlaywrightWorkerArgs["playwright"];

// 해당 사용자로 로그인한 별도 요청 컨텍스트에서 fn을 실행한다. 브라우저 쿠키는 바뀌지 않는다.
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

const candidateLabels = (table: DataTable) => table.hashes().map((r) => r["후보"].trim());
const splitLabels = (text: string) => text.split(",").map((s) => s.trim()).filter(Boolean);

// ── 사전 조건 (API) ─────────────────────────────────────

Given(
  "{string}이 {string} 투표를 다음 후보로 만들어 두었다",
  async ({ playwright, ctx }, userName: string, title: string, table: DataTable) => {
    const candidates = table.hashes().map((r) => ({ startsAt: toSeoulIso(r["날짜"], r["시각"]) }));
    await asUser(playwright, userName, async (api) => {
      const res = await api.post("/api/polls", { data: { title, candidates } });
      expect(res.status(), `사전 조건 투표 생성 실패: ${await res.text()}`).toBe(201);
      const created: { id: string; candidates: Array<{ id: string; startsAt: string }> } = await res.json();
      ctx.polls.set(title, {
        id: created.id,
        candidates: new Map(created.candidates.map((c) => [isoToLabel(c.startsAt), c.id])),
      });
    });
  },
);

async function respond(playwright: Playwright, ctx: ScenarioContext, userName: string, title: string, labels: string[]) {
  const poll = pollOf(ctx, title);
  await asUser(playwright, userName, async (api) => {
    const res = await api.put(`/api/polls/${poll.id}/response`, {
      data: { candidateIds: labels.map((l) => candidateIdOf(ctx, title, l)) },
    });
    expect(res.status(), `사전 조건 응답 실패: ${await res.text()}`).toBe(200);
  });
}

Given(
  "{string}이 {string} 투표에 다음 후보로 응답해 두었다",
  async ({ playwright, ctx }, userName: string, title: string, table: DataTable) => {
    await respond(playwright, ctx, userName, title, candidateLabels(table));
  },
);

Given(
  "다음 응답이 {string} 투표에 들어와 있다",
  async ({ playwright, ctx }, title: string, table: DataTable) => {
    for (const row of table.hashes()) {
      await respond(playwright, ctx, row["사용자"], title, splitLabels(row["가능 후보"]));
    }
  },
);

Given(
  "{string}이 {string} 투표를 {string}으로 확정해 두었다",
  async ({ playwright, ctx }, userName: string, title: string, label: string) => {
    const poll = pollOf(ctx, title);
    await asUser(playwright, userName, async (api) => {
      const res = await api.post(`/api/polls/${poll.id}/confirm`, {
        data: { candidateId: candidateIdOf(ctx, title, label) },
      });
      expect(res.status(), `사전 조건 확정 실패: ${await res.text()}`).toBe(204);
    });
  },
);

// ── 투표 목록 · 생성 ────────────────────────────────────

Given("투표 화면에 접속한다", async ({ page }) => {
  await page.goto("/polls");
});

When("{string} 투표를 다음 후보로 만든다", async ({ page }, title: string, table: DataTable) => {
  await page.getByLabel("제목").fill(title);
  for (const [i, row] of table.hashes().entries()) {
    if (i > 0) await page.getByRole("button", { name: "후보 추가" }).click();
    await page.getByLabel(`후보 ${i + 1} 날짜`).fill(row["날짜"]);
    await page.getByLabel(`후보 ${i + 1} 시각`).selectOption({ label: row["시각"] });
  }
  await page.getByRole("button", { name: "투표 만들기" }).click();
});

Then("{string} 목록에 {string}이 표시된다", async ({ page }, listName: string, item: string) => {
  const list = page.getByRole("list", { name: listName });
  await expect(list.getByRole("listitem").filter({ hasText: item })).toHaveCount(1);
});

// 부정 검증 전 가드: 목록이 로딩을 마치고 그려졌는지(toBeAttached) 먼저 확인한다.
Then("{string} 목록은 비어 있다", async ({ page }, listName: string) => {
  const list = page.getByRole("list", { name: listName });
  await expect(list).toBeAttached();
  await expect(list.getByRole("listitem")).toHaveCount(0);
});

// ── 투표 상세 · 응답 ────────────────────────────────────

Given("{string} 투표 화면에 접속한다", async ({ page, ctx }, title: string) => {
  await page.goto(`/polls/${pollOf(ctx, title).id}`);
});

async function submitResponse(page: Page, selected: string[]) {
  const form = page.getByRole("form", { name: "응답" });
  const boxes = form.getByRole("checkbox");
  await expect(boxes.first()).toBeVisible();
  for (const box of await boxes.all()) {
    const label = (await box.getAttribute("aria-label")) ?? "";
    await box.setChecked(selected.includes(label));
  }
  await form.getByRole("button", { name: "응답하기" }).click();
}

When("다음 후보에 가능으로 응답한다", async ({ page }, table: DataTable) => {
  await submitResponse(page, candidateLabels(table));
});

When("아무 후보도 고르지 않고 응답한다", async ({ page }) => {
  await submitResponse(page, []);
});

const tallyRows = (page: Page) => page.getByRole("table", { name: "집계" }).locator("tbody tr");

async function expectTally(page: Page, expected: Array<[string, string]>) {
  const rows = tallyRows(page);
  await expect(rows).toHaveCount(expected.length);
  for (const [i, [label, count]] of expected.entries()) {
    await expect(rows.nth(i).locator("td").nth(0)).toHaveText(label);
    await expect(rows.nth(i).locator("td").nth(1)).toHaveText(count);
  }
}

Then("집계에 다음과 같이 표시된다", async ({ page }, table: DataTable) => {
  await expectTally(page, table.hashes().map((r) => [r["후보"], r["가능 인원"]]));
});

Then(
  "페이지를 새로고침해도 집계에 {string}의 가능 인원은 {int}명이다",
  async ({ page }, label: string, count: number) => {
    await page.reload();
    const row = tallyRows(page).filter({ has: page.locator("td", { hasText: label }) });
    await expect(row).toHaveCount(1);
    await expect(row.locator("td").nth(1)).toHaveText(String(count));
  },
);

Then("집계의 가능 인원은 모두 0명이다", async ({ page }) => {
  const rows = tallyRows(page);
  await expect(rows.first()).toBeVisible();
  for (const row of await rows.all()) {
    await expect(row.locator("td").nth(1)).toHaveText("0");
  }
});

Then("최다 득표 후보로 다음이 표시된다", async ({ page }, table: DataTable) => {
  const items = page.getByRole("list", { name: "최다 득표 후보" }).getByRole("listitem");
  await expect(items).toHaveText(candidateLabels(table));
});

// ── 확정 ────────────────────────────────────────────────

When("{string}으로 확정한다", async ({ page }, label: string) => {
  await page.getByRole("button", { name: `${label}으로 확정` }).click();
});

Then("투표 상태가 {string}으로 표시된다", async ({ page }, status: string) => {
  await expect(page.getByTestId("poll-status")).toHaveText(status);
});

Then("확정된 시간으로 {string}이 표시된다", async ({ page }, label: string) => {
  await expect(page.getByTestId("confirmed-time")).toHaveText(label);
});

Then("응답 양식이 표시되지 않는다", async ({ page }) => {
  await expect(page.getByTestId("poll-status")).toBeVisible();
  await expect(page.getByRole("form", { name: "응답" })).toHaveCount(0);
});

Then("확정 버튼이 없다", async ({ page }) => {
  // 상세 화면과 집계가 그려진 상태에서 확인한다.
  await expect(tallyRows(page).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /으로 확정$/ })).toHaveCount(0);
});

// ── API 직접 요청 ───────────────────────────────────────

When(
  "{string} 투표를 {string}으로 확정하도록 API로 직접 요청한다",
  async ({ page, ctx }, title: string, label: string) => {
    ctx.lastResponse = await capture(
      await page.request.post(`${API_URL}/api/polls/${pollOf(ctx, title).id}/confirm`, {
        data: { candidateId: candidateIdOf(ctx, title, label) },
      }),
    );
  },
);

When(
  "{string} 투표를 {string}의 {string} 후보로 확정하도록 API로 직접 요청한다",
  async ({ page, ctx }, title: string, otherTitle: string, label: string) => {
    ctx.lastResponse = await capture(
      await page.request.post(`${API_URL}/api/polls/${pollOf(ctx, title).id}/confirm`, {
        data: { candidateId: candidateIdOf(ctx, otherTitle, label) },
      }),
    );
  },
);

When(
  "{string} 투표에 {string} 가능 응답을 API로 직접 요청한다",
  async ({ page, ctx }, title: string, label: string) => {
    ctx.lastResponse = await capture(
      await page.request.put(`${API_URL}/api/polls/${pollOf(ctx, title).id}/response`, {
        data: { candidateIds: [candidateIdOf(ctx, title, label)] },
      }),
    );
  },
);

When(
  "로그인하지 않은 상태로 {string} 투표에 {string} 가능 응답을 API로 직접 요청한다",
  async ({ playwright, ctx }, title: string, label: string) => {
    const api = await playwright.request.newContext({ baseURL: API_URL });
    try {
      ctx.lastResponse = await capture(
        await api.put(`/api/polls/${pollOf(ctx, title).id}/response`, {
          data: { candidateIds: [candidateIdOf(ctx, title, label)] },
        }),
      );
    } finally {
      await api.dispose();
    }
  },
);

// 화면과 무관하게 데이터 자체를 API로 확인한다.
Then("투표 상태는 {string}으로 유지된다", async ({ page, ctx }, status: string) => {
  const [poll] = [...ctx.polls.values()];
  const res = await page.request.get(`${API_URL}/api/polls/${poll.id}`);
  expect(res.status()).toBe(200);
  expect((await res.json()).status).toBe(status === "투표 중" ? "open" : "confirmed");
});
