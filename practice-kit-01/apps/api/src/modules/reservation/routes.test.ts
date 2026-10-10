import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { RESERVATION_MESSAGES as M } from "@kit/contracts";
import { buildApp } from "../../app.js";

// 백엔드 입력 검증 단위 테스트.
// 인증·검증은 DB 조회 전에 끝나므로 DB 없이 app.inject()로 확인한다.
// 프론트가 같은 스키마로 미리 막더라도, API를 직접 호출하면 이 검증만이 방어선이다.

let app: FastifyInstance;
let sessionCookie: string;

const valid = {
  roomId: "r-1",
  title: "주간 회의",
  startAt: "2099-12-01T10:00:00+09:00",
  endAt: "2099-12-01T11:00:00+09:00",
};

beforeEach(async () => {
  app = await buildApp();
  sessionCookie = app.signCookie("u-sangeun");
});

afterEach(async () => {
  await app.close();
});

function post(payload: unknown, cookie: string | null = sessionCookie) {
  return app.inject({
    method: "POST",
    url: "/api/reservations",
    payload: payload as object,
    cookies: cookie ? { uid: cookie } : {},
  });
}

describe("POST /api/reservations 인증", () => {
  it("비로그인은 401 (검증보다 먼저)", async () => {
    const res = await post({ ...valid, title: "" }, null);
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe("UNAUTHORIZED");
  });
});

describe("POST /api/reservations 입력 검증", () => {
  it.each([
    ["빈 제목 (AC-03)", { ...valid, title: "" }, M.titleRequired],
    ["공백 제목", { ...valid, title: "   " }, M.titleRequired],
    ["종료 < 시작 (AC-04)", { ...valid, startAt: valid.endAt, endAt: valid.startAt }, M.endAfterStart],
    ["종료 = 시작", { ...valid, endAt: valid.startAt }, M.endAfterStart],
    ["30분 단위 아님", { ...valid, startAt: "2099-12-01T10:15:00+09:00" }, M.slotUnit],
    ["시각 형식 오류", { ...valid, startAt: "10:00" }, M.dateTimeRequired],
    ["회의실 없음", { ...valid, roomId: "" }, M.roomRequired],
  ])("%s → 400 VALIDATION_ERROR", async (_label, payload, message) => {
    const res = await post(payload);
    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({ error: { code: "VALIDATION_ERROR", message } });
  });

  it("body가 없으면 400", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/reservations",
      cookies: { uid: sessionCookie },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe("GET /api/reservations", () => {
  it("비로그인은 401", async () => {
    const res = await app.inject({ method: "GET", url: "/api/reservations?mine=true" });
    expect(res.statusCode).toBe(401);
  });

  it("조회 조건이 없으면 400", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/reservations",
      cookies: { uid: sessionCookie },
    });
    expect(res.statusCode).toBe(400);
  });
});
