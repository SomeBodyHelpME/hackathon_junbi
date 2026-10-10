import { expect, type Page } from "@playwright/test";
import { API_URL, Given, Then, When, capture, roomIdOf, toSeoulIso, userIdOf } from "./fixtures";

/*
 * 이 파일이 정하는 화면/API 계약 (REQ-01~03 구현이 따라야 한다)
 *
 * [예약 화면] /reservations
 *   - 예약 폼: 라벨 "회의실"(select, 옵션=회의실 이름), "날짜"(date), "시작 시각"·"종료 시각"
 *     (select, 옵션="HH:MM" 30분 단위), "제목"(text), 버튼 "예약하기"
 *   - 오류는 role="alert"에 표시
 *   - 내 예약 목록: <ul aria-label="내 예약">, 항목마다 제목과 "취소" 버튼
 *
 * [회의실 예약 현황] 메인(/)의 회의실 목록에서 회의실 이름 링크 클릭 → 현황 화면
 *   - 라벨 "날짜"(date)로 조회 날짜 선택
 *   - 현황 목록: <ul aria-label="예약 현황">, 본인 예약에만 "취소" 버튼
 *
 * [API]
 *   - POST   /api/reservations { roomId, title, startAt, endAt }  (startAt/endAt: ISO 8601)
 *            → 201 { id, ... }
 *   - DELETE /api/reservations/:id → 204 / 401 / 403 / 404
 *   - GET    /api/reservations?roomId=&date=YYYY-MM-DD → 200 [{ id, title, ... }]
 */

// ── 사전 조건 (API) ─────────────────────────────────────

// 브라우저와 분리된 요청 컨텍스트에서 해당 사용자로 로그인해 예약한다.
// page.request를 쓰면 브라우저 쿠키가 그 사용자로 바뀌므로 쓰지 않는다.
Given(
  "{string}이 {string} 회의실을 {string} {string}부터 {string}까지 {string}(으)로 예약해 두었다",
  async (
    { playwright, ctx },
    userName: string,
    roomName: string,
    date: string,
    start: string,
    end: string,
    title: string,
  ) => {
    const api = await playwright.request.newContext({ baseURL: API_URL });
    try {
      const login = await api.post("/api/auth/fake-login", {
        data: { userId: userIdOf(userName) },
      });
      expect(login.status(), `"${userName}" 로그인 실패`).toBe(200);

      const res = await api.post("/api/reservations", {
        data: {
          roomId: roomIdOf(roomName),
          title,
          startAt: toSeoulIso(date, start),
          endAt: toSeoulIso(date, end),
        },
      });
      expect(res.status(), `사전 조건 예약 생성 실패: ${await res.text()}`).toBe(201);
      const created = await res.json();
      ctx.reservationIds.set(title, created.id);
    } finally {
      await api.dispose();
    }
  },
);

// ── 예약 화면 ───────────────────────────────────────────

Given("예약 화면에 접속한다", async ({ page }) => {
  await page.goto("/reservations");
});

async function fillReservationForm(
  page: Page,
  room: string,
  date: string,
  start: string,
  end: string,
  title: string,
) {
  await page.getByLabel("회의실").selectOption({ label: room });
  await page.getByLabel("날짜").fill(date);
  await page.getByLabel("시작 시각").selectOption({ label: start });
  await page.getByLabel("종료 시각").selectOption({ label: end });
  await page.getByLabel("제목").fill(title);
  await page.getByRole("button", { name: "예약하기" }).click();
}

When(
  "{string} 회의실을 {string} {string}부터 {string}까지 {string}(으)로 예약한다",
  async ({ page }, room: string, date: string, start: string, end: string, title: string) => {
    await fillReservationForm(page, room, date, start, end, title);
  },
);

When(
  "{string} 회의실을 {string} {string}부터 {string}까지 제목 없이 예약한다",
  async ({ page }, room: string, date: string, start: string, end: string) => {
    await fillReservationForm(page, room, date, start, end, "");
  },
);

When(
  "{string} 목록에서 {string}를 취소한다",
  async ({ page }, listName: string, title: string) => {
    const item = page
      .getByRole("list", { name: listName })
      .getByRole("listitem")
      .filter({ hasText: title });
    await item.getByRole("button", { name: "취소" }).click();
  },
);

// ── 회의실 예약 현황 ────────────────────────────────────

When(
  "{string} 회의실의 {string} 예약 현황을 조회한다",
  async ({ page }, roomName: string, date: string) => {
    await page.goto("/");
    await page
      .getByRole("list", { name: "회의실 목록" })
      .getByRole("link", { name: roomName })
      .click();
    await page.getByLabel("날짜").fill(date);
  },
);

function scheduleItem(page: Page, title: string) {
  return page
    .getByRole("list", { name: "예약 현황" })
    .getByRole("listitem")
    .filter({ hasText: title });
}

Then("{string} 예약이 표시된다", async ({ page }, title: string) => {
  await expect(scheduleItem(page, title)).toHaveCount(1);
});

Then("{string} 예약에는 취소 버튼이 없다", async ({ page }, title: string) => {
  const item = scheduleItem(page, title);
  // 예약이 실제로 보이는 상태에서 버튼이 없는지 확인한다 (빈 화면에서 통과하는 것 방지).
  await expect(item).toBeVisible();
  await expect(item.getByRole("button", { name: "취소" })).toHaveCount(0);
});

// ── API 직접 요청 (보안) ────────────────────────────────

When("{string} 예약의 취소를 API로 직접 요청한다", async ({ page, ctx }, title: string) => {
  const id = ctx.reservationIds.get(title);
  expect(id, `사전 조건에서 "${title}" 예약을 만들지 않았습니다`).toBeDefined();
  // 현재 브라우저 세션(로그인한 사용자)의 쿠키로 요청한다.
  ctx.lastResponse = await capture(
    await page.request.delete(`${API_URL}/api/reservations/${id}`),
  );
});

When("로그인하지 않은 상태로 예약 생성을 API로 직접 요청한다", async ({ playwright, ctx }) => {
  // 쿠키가 없는 새 컨텍스트 = 비로그인
  const api = await playwright.request.newContext({ baseURL: API_URL });
  try {
    const res = await api.post("/api/reservations", {
      data: {
        roomId: roomIdOf("한라"),
        title: "비로그인 예약",
        startAt: toSeoulIso("2099-12-01", "10:00"),
        endAt: toSeoulIso("2099-12-01", "11:00"),
      },
    });
    // dispose 전에 상태와 본문을 꺼내 둔다.
    ctx.lastResponse = await capture(res);
  } finally {
    await api.dispose();
  }
});

Then("{string} 예약은 그대로 유지된다", async ({ page, ctx }, title: string) => {
  const id = ctx.reservationIds.get(title);
  expect(id, `사전 조건에서 "${title}" 예약을 만들지 않았습니다`).toBeDefined();
  // DB에 남아 있는지 API로 확인한다 (화면 표시와 무관하게 데이터 자체를 검증).
  const res = await page.request.get(`${API_URL}/api/reservations`, {
    params: { roomId: roomIdOf("한라"), date: "2099-12-01" },
  });
  expect(res.status()).toBe(200);
  const list: Array<{ id: string; title: string }> = await res.json();
  expect(list.map((r) => r.id)).toContain(id);
});
