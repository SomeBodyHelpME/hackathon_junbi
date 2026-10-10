import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../../app.js";

// 백엔드 입력 검증·인증 단위 테스트. DB 조회 전에 끝나는 경로만 app.inject()로 확인한다.
let app: FastifyInstance;
let cookie: string;

beforeEach(async () => {
  app = await buildApp();
  cookie = app.signCookie("u-sangeun");
});

afterEach(async () => {
  await app.close();
});

const req = (method: "GET" | "POST", url: string, payload?: object, uid: string | null = cookie) =>
  app.inject({ method, url, payload, cookies: uid ? { uid } : {} });

describe("인증 (401)", () => {
  it.each([
    ["GET", "/api/loans?mine=true"],
    ["POST", "/api/loans"],
  ] as const)("%s %s 비로그인은 401 (AC-08)", async (method, url) => {
    const res = await req(method, url, { bookId: "b-1" }, null);
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe("UNAUTHORIZED");
  });
});

describe("입력 검증 (400)", () => {
  it("bookId가 없으면 400", async () => {
    const res = await req("POST", "/api/loans", {});
    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({ error: { code: "VALIDATION_ERROR", message: "도서를 선택하세요" } });
  });

  it("조회 조건(mine=true)이 없으면 400", async () => {
    expect((await req("GET", "/api/loans")).statusCode).toBe(400);
  });
});

