import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../../app.js";
import { db, pool } from "../../db/client.js";
import { candidates, polls } from "../../db/schema.js";

// 통합 테스트: 실제 PostgreSQL 필요. 투표 데이터를 지운다.
let app: FastifyInstance;

beforeEach(async () => {
  await db.delete(polls);
  app ??= await buildApp();
});

afterAll(async () => {
  await db.delete(polls);
  await app?.close();
  await pool.end();
});

const as = (userId: string) => ({ uid: app.signCookie(userId) });
const at = (hhmm: string) => ({ startsAt: `2099-12-01T${hhmm}:00+09:00` });

describe("투표 생성 (REQ-01)", () => {
  it("투표와 후보가 한 번에 저장되고, 후보는 시간순으로 돌려준다", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/polls",
      cookies: as("u-sangeun"),
      payload: { title: "주간 회의 일정", candidates: [at("14:00"), at("10:00")] },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ title: "주간 회의 일정", status: "open", createdByName: "상은" });
    expect(res.json().candidates.map((c: { startsAt: string }) => c.startsAt)).toEqual([
      "2099-12-01T01:00:00.000Z",
      "2099-12-01T05:00:00.000Z",
    ]);
  });

  it("DB도 같은 투표 안의 후보 시간 중복을 막는다 (앱 검증 우회 시 최종 방어선)", async () => {
    const [p] = await db.insert(polls).values({ title: "x", createdBy: "u-sangeun" }).returning();
    const startsAt = new Date("2099-12-01T01:00:00Z");
    await db.insert(candidates).values({ pollId: p.id, startsAt });
    await expect(db.insert(candidates).values({ pollId: p.id, startsAt })).rejects.toThrow();
  });
});
