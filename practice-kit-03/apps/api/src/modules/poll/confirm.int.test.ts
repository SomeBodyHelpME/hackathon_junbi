import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { buildApp } from "../../app.js";
import { db, pool } from "../../db/client.js";
import { polls, responseChoices } from "../../db/schema.js";

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
const at = (hhmm: string, date = "2099-12-01") => ({ startsAt: `${date}T${hhmm}:00+09:00` });

async function createPoll(userId = "u-sangeun", title = "주간 회의 일정", cands = [at("10:00"), at("14:00")]) {
  const res = await app.inject({ method: "POST", url: "/api/polls", cookies: as(userId), payload: { title, candidates: cands } });
  const body = res.json() as { id: string; candidates: Array<{ id: string }> };
  return { id: body.id, c: body.candidates.map((c) => c.id) };
}

const confirm = (pollId: string, userId: string, candidateId: string) =>
  app.inject({ method: "POST", url: `/api/polls/${pollId}/confirm`, cookies: as(userId), payload: { candidateId } });
const respond = (pollId: string, userId: string, candidateIds: string[]) =>
  app.inject({ method: "PUT", url: `/api/polls/${pollId}/response`, cookies: as(userId), payload: { candidateIds } });
const status = async (pollId: string) => (await db.select().from(polls).where(eq(polls.id, pollId)))[0];

describe("확정 (REQ-03)", () => {
  it("개설자는 후보 하나로 확정할 수 있다 (AC-08)", async () => {
    const p = await createPoll();
    expect((await confirm(p.id, "u-sangeun", p.c[1])).statusCode).toBe(204);
    expect(await status(p.id)).toMatchObject({ status: "confirmed", confirmedCandidateId: p.c[1] });
  });

  it("개설자가 아니면 403 FORBIDDEN, 투표 중 유지 (AC-09)", async () => {
    const p = await createPoll();
    const res = await confirm(p.id, "u-gwaneung", p.c[1]);
    expect(res.statusCode).toBe(403);
    expect(res.json()).toEqual({ error: { code: "FORBIDDEN", message: "투표를 만든 사람만 확정할 수 있습니다" } });
    expect((await status(p.id)).status).toBe("open");
  });

  it("확정된 투표에 응답하면 409 POLL_CONFIRMED (AC-10), 다시 확정해도 409", async () => {
    const p = await createPoll();
    await confirm(p.id, "u-sangeun", p.c[1]);
    const res = await respond(p.id, "u-gwaneung", [p.c[0]]);
    expect(res.statusCode).toBe(409);
    expect(res.json()).toEqual({ error: { code: "POLL_CONFIRMED", message: "이미 확정된 투표입니다" } });
    expect((await confirm(p.id, "u-sangeun", p.c[0])).statusCode).toBe(409);
  });

  it("다른 투표의 후보로 확정하면 400 INVALID_CANDIDATE, 투표 중 유지 (AC-11)", async () => {
    const p = await createPoll();
    const other = await createPoll("u-gwaneung", "점심 회식 일정", [at("12:00", "2099-12-03"), at("12:00", "2099-12-04")]);
    const res = await confirm(p.id, "u-sangeun", other.c[0]);
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe("INVALID_CANDIDATE");
    expect((await status(p.id)).status).toBe("open");
  });

  it("DB도 다른 투표의 후보로 확정되는 것을 막는다 (복합 FK, 앱 검증 우회 시)", async () => {
    const p = await createPoll();
    const other = await createPoll("u-gwaneung", "점심 회식 일정", [at("12:00", "2099-12-03"), at("12:00", "2099-12-04")]);
    await expect(
      db.update(polls).set({ status: "confirmed", confirmedCandidateId: other.c[0] }).where(eq(polls.id, p.id)),
    ).rejects.toThrow();
  });

  it("DB는 상태와 확정 후보가 어긋나는 것을 막는다 (확정인데 후보 없음)", async () => {
    const p = await createPoll();
    await expect(db.update(polls).set({ status: "confirmed" }).where(eq(polls.id, p.id))).rejects.toThrow();
  });

  it("확정 트랜잭션이 진행 중이면 응답은 기다렸다가 409를 받는다 (확정 뒤 응답 방지)", async () => {
    const p = await createPoll();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT 1 FROM polls WHERE id = $1 FOR UPDATE", [p.id]);

      const pending = respond(p.id, "u-gwaneung", [p.c[0]]);
      await new Promise((r) => setTimeout(r, 200)); // 응답 요청이 잠금 대기에 들어가도록

      await client.query("UPDATE polls SET status = 'confirmed', confirmed_candidate_id = $2 WHERE id = $1", [p.id, p.c[1]]);
      await client.query("COMMIT");

      const res = await pending;
      expect(res.statusCode).toBe(409);
      expect(res.json().error.code).toBe("POLL_CONFIRMED");
      expect(await db.select().from(responseChoices)).toHaveLength(0);
    } finally {
      client.release();
    }
  });
});
