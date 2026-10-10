import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../../app.js";
import { db, pool } from "../../db/client.js";
import { polls, responseChoices, responses } from "../../db/schema.js";

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

async function createPoll(title = "주간 회의 일정", times = ["10:00", "14:00", "16:00"]) {
  const res = await app.inject({
    method: "POST",
    url: "/api/polls",
    cookies: as("u-sangeun"),
    payload: { title, candidates: times.map(at) },
  });
  const body = res.json() as { id: string; candidates: Array<{ id: string }> };
  return { id: body.id, c: body.candidates.map((c) => c.id) };
}

const respond = (pollId: string, userId: string, candidateIds: string[]) =>
  app.inject({ method: "PUT", url: `/api/polls/${pollId}/response`, cookies: as(userId), payload: { candidateIds } });
const detail = async (pollId: string, userId = "u-sangeun") =>
  (await app.inject({ method: "GET", url: `/api/polls/${pollId}`, cookies: as(userId) })).json();

describe("응답과 집계 (REQ-02)", () => {
  it("응답하면 후보별 가능 인원과 내 응답이 반영된다 (AC-04)", async () => {
    const p = await createPoll();
    expect((await respond(p.id, "u-gwaneung", [p.c[0], p.c[2]])).statusCode).toBe(200);
    const d = await detail(p.id, "u-gwaneung");
    expect(d.candidates.map((c: { count: number }) => c.count)).toEqual([1, 0, 1]);
    expect(d.myChoices.sort()).toEqual([p.c[0], p.c[2]].sort());
  });

  it("다시 응답하면 이전 응답을 대체한다 (AC-05)", async () => {
    const p = await createPoll();
    await respond(p.id, "u-gwaneung", [p.c[0]]);
    await respond(p.id, "u-gwaneung", [p.c[1]]);
    expect((await detail(p.id)).candidates.map((c: { count: number }) => c.count)).toEqual([0, 1, 0]);
    expect(await db.select().from(responses)).toHaveLength(1);
  });

  it("최다 득표 후보는 동률이면 모두, 응답이 없으면 없다 (AC-06)", async () => {
    const p = await createPoll();
    expect((await detail(p.id)).topCandidateIds).toEqual([]);
    await respond(p.id, "u-sangeun", [p.c[0], p.c[1]]);
    await respond(p.id, "u-gwaneung", [p.c[1]]);
    await respond(p.id, "u-byeongwook", [p.c[0]]);
    expect((await detail(p.id)).topCandidateIds).toEqual([p.c[0], p.c[1]]);
  });

  it("다른 투표의 후보 id가 섞이면 400 INVALID_CANDIDATE, 응답은 저장되지 않는다", async () => {
    const p = await createPoll();
    const other = await createPoll("점심 회식 일정", ["12:00", "13:00"]);
    const res = await respond(p.id, "u-gwaneung", [p.c[0], other.c[0]]);
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe("INVALID_CANDIDATE");
    expect(await db.select().from(responseChoices)).toHaveLength(0);
  });

  it("DB도 다른 투표의 후보를 선택으로 저장하지 못하게 막는다 (복합 FK)", async () => {
    const p = await createPoll();
    const other = await createPoll("점심 회식 일정", ["12:00", "13:00"]);
    await db.insert(responses).values({ pollId: p.id, userId: "u-gwaneung" });
    await expect(
      db.insert(responseChoices).values({ pollId: p.id, userId: "u-gwaneung", candidateId: other.c[0] }),
    ).rejects.toThrow();
  });

  it("같은 사용자가 서로 다른 응답을 동시에 10번 보내도 응답 하나만 남고, 선택이 합쳐지지 않는다", async () => {
    const p = await createPoll();
    const sets = [[p.c[0]], [p.c[1]], [p.c[2]], [p.c[0], p.c[1]], [p.c[1], p.c[2]]];
    const results = await Promise.all(
      Array.from({ length: 10 }, (_, i) => respond(p.id, "u-gwaneung", sets[i % sets.length])),
    );
    expect(results.every((r) => r.statusCode === 200)).toBe(true);
    expect(await db.select().from(responses)).toHaveLength(1);

    const saved = (await db.select().from(responseChoices)).map((r) => r.candidateId).sort();
    const candidatesSets = sets.map((s) => [...s].sort().join());
    expect(candidatesSets).toContain(saved.join());
  });
});
