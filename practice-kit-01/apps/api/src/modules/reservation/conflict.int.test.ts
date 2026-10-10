import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { buildApp } from "../../app.js";
import { db, pool } from "../../db/client.js";
import { reservations } from "../../db/schema.js";
import { hasPgCode, PG_EXCLUSION_VIOLATION } from "../../common/db-errors.js";
import { insertReservation } from "./repository.js";
import { overlaps } from "./overlap.js";
import { EXISTING, OVERLAP_CASES, at } from "./overlap.cases.js";

// 통합 테스트: 실제 PostgreSQL 필요 (docker compose up -d --wait && pnpm db:migrate && pnpm db:seed).
// 예약 데이터를 지우므로 테스트 전용 날짜(2099-12-01)만 사용한다.

beforeEach(async () => {
  await db.delete(reservations);
});

afterAll(async () => {
  await db.delete(reservations);
  await pool.end();
});

const base = { roomId: "r-1", userId: "u-gwaneung", title: "기존 회의" };

describe("DB exclusion constraint는 overlaps()와 같은 판정을 한다", () => {
  it.each(OVERLAP_CASES)("%s %s~%s → 겹침 %s", async (_label, start, end, expected) => {
    await insertReservation({ ...base, startAt: at(EXISTING.start), endAt: at(EXISTING.end) });

    // TS 함수의 판정
    const candidate = { start: at(start), end: at(end) };
    expect(overlaps(candidate, { start: at(EXISTING.start), end: at(EXISTING.end) })).toBe(expected);

    // DB 제약의 판정
    const attempt = insertReservation({
      roomId: "r-1",
      userId: "u-sangeun",
      title: "새 회의",
      startAt: candidate.start,
      endAt: candidate.end,
    });
    if (expected) {
      const err = await attempt.then(() => null, (e: unknown) => e);
      expect(hasPgCode(err, PG_EXCLUSION_VIOLATION), "겹침인데 DB가 막지 않았습니다").toBe(true);
    } else {
      await expect(attempt).resolves.toMatchObject({ title: "새 회의" });
    }
  });

  it("다른 회의실이면 같은 시간도 허용 (AC-07)", async () => {
    await insertReservation({ ...base, startAt: at("10:00"), endAt: at("11:00") });
    await expect(
      insertReservation({ ...base, roomId: "r-2", startAt: at("10:00"), endAt: at("11:00") }),
    ).resolves.toBeDefined();
  });

  it("앱 검증을 거치지 않아도 DB가 종료 <= 시작을 거부한다", async () => {
    await expect(
      db.execute(
        sql`insert into reservations (room_id, user_id, title, start_at, end_at)
            values ('r-1', 'u-sangeun', 'x', ${at("11:00").toISOString()}, ${at("10:00").toISOString()})`,
      ),
    ).rejects.toThrow();
  });
});

describe("동시 요청", () => {
  it("같은 시간대 예약 10건을 동시에 보내면 1건만 201, 나머지는 409", async () => {
    const app = await buildApp();
    try {
      const users = ["u-sangeun", "u-gwaneung"];
      const requests = Array.from({ length: 10 }, (_, i) =>
        app.inject({
          method: "POST",
          url: "/api/reservations",
          cookies: { uid: app.signCookie(users[i % 2]) },
          payload: {
            roomId: "r-1",
            title: `동시 요청 ${i}`,
            startAt: "2099-12-01T10:00:00+09:00",
            endAt: "2099-12-01T11:00:00+09:00",
          },
        }),
      );
      const responses = await Promise.all(requests);
      const statuses = responses.map((r) => r.statusCode).sort();

      expect(statuses.filter((s) => s === 201)).toHaveLength(1);
      expect(statuses.filter((s) => s === 409)).toHaveLength(9);
      for (const r of responses.filter((r) => r.statusCode === 409)) {
        expect(r.json()).toEqual({
          error: { code: "RESERVATION_CONFLICT", message: "이미 예약된 시간입니다" },
        });
      }

      const rows = await db.select().from(reservations);
      expect(rows).toHaveLength(1);
    } finally {
      await app.close();
    }
  });
});
