import { expect } from "@playwright/test";
import { API_URL, Before, Given, Then, When, userIdOf } from "./fixtures";

// 시나리오마다 예약 데이터를 초기화한다. 시드(사용자·회의실)는 유지된다.
Before(async ({ request }) => {
  const res = await request.post(`${API_URL}/api/test/reset`);
  expect(
    res.status(),
    "reset 실패: API가 NODE_ENV=test로 실행 중인지 확인하세요 (pnpm dev가 떠 있으면 종료)",
  ).toBe(204);
});

// 사전 조건이므로 UI가 아니라 API로 로그인한다.
// page.request는 브라우저 컨텍스트와 쿠키를 공유하므로, 이후 화면도 로그인 상태가 된다.
Given("{string}으로 로그인한다", async ({ page }, name: string) => {
  const res = await page.request.post(`${API_URL}/api/auth/fake-login`, {
    data: { userId: userIdOf(name) },
  });
  expect(res.status(), `"${name}" 로그인 실패`).toBe(200);
});

When("메인 화면에 접속한다", async ({ page }) => {
  await page.goto("/");
});

Then("로그인한 사용자로 {string}이 표시된다", async ({ page }, name: string) => {
  await expect(page.getByTestId("current-user")).toHaveText(name);
});

// 목록은 aria-label로 찾는다 (예: <ul aria-label="내 예약">).
// 화면은 데이터를 다 불러온 뒤에만 목록을 렌더링해야 한다.
// 로딩 중에 빈 목록을 먼저 그리면 "표시되지 않는다" 검증이 잘못 통과할 수 있다.
Then(
  "페이지를 새로고침해도 {string} 목록에 {string}가 표시된다",
  async ({ page }, listName: string, item: string) => {
    await page.reload();
    const list = page.getByRole("list", { name: listName });
    await expect(list.getByRole("listitem").filter({ hasText: item })).toHaveCount(1);
  },
);

Then(
  "페이지를 새로고침해도 {string} 목록에 {string}가 표시되지 않는다",
  async ({ page }, listName: string, item: string) => {
    await page.reload();
    const list = page.getByRole("list", { name: listName });
    await expect(list).toBeVisible();
    await expect(list.getByRole("listitem").filter({ hasText: item })).toHaveCount(0);
  },
);
