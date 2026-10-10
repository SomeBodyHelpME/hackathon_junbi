import { expect } from "@playwright/test";
import { API_URL, Before, Given, Then, When, userIdOf } from "./fixtures";

// 시나리오마다 모집·주문 데이터를 초기화한다. 시드(사용자·메뉴)는 유지된다.
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
