import { expect } from "@playwright/test";
import { API_URL, Before, Given, Then, When, userIdOf } from "./fixtures";

// 시나리오마다 투표·응답 데이터를 초기화한다. 시드(사용자)는 유지된다.
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

// ── 오류 표시 ───────────────────────────────────────────
// Next.js route announcer도 role="alert"라서 해당 문구를 가진 alert를 찾는다.
Then("{string} 오류가 표시된다", async ({ page }, message: string) => {
  await expect(page.getByRole("alert").filter({ hasText: message })).toBeVisible();
});

// ── API 직접 요청 결과 ──────────────────────────────────
const REJECT_CODES: Record<string, string> = {
  "인증 필요": "UNAUTHORIZED",
  "권한 없음": "FORBIDDEN",
  확정됨: "POLL_CONFIRMED",
  "잘못된 후보": "INVALID_CANDIDATE",
};

// "권한 없음(403)으로" / "인증 필요(401)로" 처럼 조사가 달라 정규식을 쓴다.
Then(
  /^요청은 (.+)\((\d{3})\)(?:으로|로) 거부된다$/,
  async ({ ctx }, reason: string, status: string) => {
    const res = ctx.lastResponse;
    expect(res, "직전 Step에서 API 요청을 보내지 않았습니다").not.toBeNull();
    expect(res!.status, `응답 본문: ${JSON.stringify(res!.body)}`).toBe(Number(status));
    const code = REJECT_CODES[reason];
    expect(code, `알 수 없는 거부 사유: ${reason}`).toBeDefined();
    expect(res!.body).toMatchObject({ error: { code } });
  },
);
