import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { POLL_MESSAGES as M } from "@kit/contracts";
import { buildApp } from "../../app.js";

// 백엔드 입력 검증·인증 단위 테스트. DB 조회 전에 끝나는 경로만 app.inject()로 확인한다.
let app: FastifyInstance;
let cookie: string;
const pollId = "00000000-0000-4000-8000-000000000000";
const at = (hhmm: string) => ({ startsAt: `2099-12-01T${hhmm}:00+09:00` });

beforeEach(async () => {
  app = await buildApp();
  cookie = app.signCookie("u-sangeun");
});

afterEach(async () => {
  await app.close();
});

const req = (method: "GET" | "POST" | "PUT", url: string, payload?: object, uid: string | null = cookie) =>
  app.inject({ method, url, payload, cookies: uid ? { uid } : {} });

describe("인증 (401)", () => {
  it.each([
    ["GET", "/api/polls"],
    ["POST", "/api/polls"],
    ["GET", `/api/polls/${pollId}`],
  ] as const)("%s %s 비로그인은 401", async (method, url) => {
    const res = await req(method, url, {}, null);
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe("UNAUTHORIZED");
  });
});

describe("POST /api/polls 입력 검증", () => {
  it.each([
    ["후보 1개 (AC-02)", { title: "주간 회의", candidates: [at("10:00")] }, M.candidateCount],
    ["후보 중복 (AC-03)", { title: "주간 회의", candidates: [at("10:00"), at("10:00")] }, M.candidateDuplicate],
    ["후보 6개", { title: "주간 회의", candidates: ["09", "10", "11", "12", "13", "14"].map((h) => at(`${h}:00`)) }, M.candidateCount],
    ["빈 제목", { title: "", candidates: [at("10:00"), at("11:00")] }, M.titleRequired],
  ])("%s → 400", async (_label, payload, message) => {
    const res = await req("POST", "/api/polls", payload);
    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({ error: { code: "VALIDATION_ERROR", message } });
  });

  it("투표 id가 UUID가 아니면 404", async () => {
    expect((await req("GET", "/api/polls/not-a-uuid")).statusCode).toBe(404);
  });
});

describe("PUT /api/polls/:id/response", () => {
  it("비로그인은 401 (AC-12와 같은 원칙)", async () => {
    const res = await req("PUT", `/api/polls/${pollId}/response`, { candidateIds: [] }, null);
    expect(res.statusCode).toBe(401);
  });

  it("빈 응답은 400 '가능한 시간을 하나 이상 선택하세요' (AC-07)", async () => {
    const res = await req("PUT", `/api/polls/${pollId}/response`, { candidateIds: [] });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({ error: { code: "VALIDATION_ERROR", message: M.choiceRequired } });
  });
});
