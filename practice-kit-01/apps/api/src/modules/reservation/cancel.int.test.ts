import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../../app.js";
import { db, pool } from "../../db/client.js";
import { reservations } from "../../db/schema.js";
import { insertReservation } from "./repository.js";
import { at } from "./overlap.cases.js";

// 통합 테스트: 실제 PostgreSQL 필요. 예약 데이터를 지운다.
let app: FastifyInstance;

beforeEach(async () => {
  await db.delete(reservations);
  app ??= await buildApp();
});

afterAll(async () => {
  await db.delete(reservations);
  await app?.close();
  await pool.end();
});

const as = (userId: string) => ({ uid: app.signCookie(userId) });

async function gwaneungMeeting() {
  return insertReservation({
    roomId: "r-1",
    userId: "u-gwaneung",
    title: "관응 회의",
    startAt: at("10:00"),
    endAt: at("11:00"),
  });
}

describe("DELETE /api/reservations/:id 권한 (REQ-03)", () => {
  it("본인 예약은 204로 삭제되고 같은 시간에 다시 예약할 수 있다 (AC-08)", async () => {
    const r = await gwaneungMeeting();
    const res = await app.inject({ method: "DELETE", url: `/api/reservations/${r.id}`, cookies: as("u-gwaneung") });
    expect(res.statusCode).toBe(204);
    expect(await db.select().from(reservations)).toHaveLength(0);

    // hard delete이므로 취소한 시간대가 exclusion constraint에 걸리지 않는다.
    await expect(gwaneungMeeting()).resolves.toBeDefined();
  });

  it("타인 예약은 403 FORBIDDEN, 예약은 유지된다 (AC-10)", async () => {
    const r = await gwaneungMeeting();
    const res = await app.inject({ method: "DELETE", url: `/api/reservations/${r.id}`, cookies: as("u-sangeun") });
    expect(res.statusCode).toBe(403);
    expect(res.json()).toEqual({
      error: { code: "FORBIDDEN", message: "본인 예약만 취소할 수 있습니다" },
    });
    expect(await db.select().from(reservations)).toHaveLength(1);
  });

  it("위조 쿠키로 타인 행세를 하면 401 (서명 검증)", async () => {
    const r = await gwaneungMeeting();
    const res = await app.inject({
      method: "DELETE",
      url: `/api/reservations/${r.id}`,
      cookies: { uid: "u-gwaneung.forged" },
    });
    expect(res.statusCode).toBe(401);
    expect(await db.select().from(reservations)).toHaveLength(1);
  });

  it("없는 예약은 404", async () => {
    const res = await app.inject({
      method: "DELETE",
      url: "/api/reservations/00000000-0000-4000-8000-000000000000",
      cookies: as("u-sangeun"),
    });
    expect(res.statusCode).toBe(404);
  });
});

describe("GET /api/reservations?roomId=&date= (Asia/Seoul 하루)", () => {
  it("해당 회의실의 그날 예약만 반환한다", async () => {
    await gwaneungMeeting();
    await insertReservation({ roomId: "r-1", userId: "u-sangeun", title: "다음 날", startAt: at("10:00", "2099-12-02"), endAt: at("11:00", "2099-12-02") });
    await insertReservation({ roomId: "r-2", userId: "u-sangeun", title: "다른 방", startAt: at("10:00"), endAt: at("11:00") });
    // 서울 00:30은 UTC로 전날 15:30 → UTC 날짜로 자르면 빠지는 경계 사례
    await insertReservation({ roomId: "r-1", userId: "u-sangeun", title: "새벽", startAt: at("00:30"), endAt: at("01:00") });

    const res = await app.inject({
      method: "GET",
      url: "/api/reservations?roomId=r-1&date=2099-12-01",
      cookies: as("u-sangeun"),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().map((r: { title: string }) => r.title)).toEqual(["새벽", "관응 회의"]);
  });
});
