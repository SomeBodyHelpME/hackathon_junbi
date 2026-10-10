import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "./app.js";

// DB 없이 확인 가능한 공통부 동작. app.inject()로 포트를 열지 않고 요청한다.
let app: FastifyInstance | undefined;
const originalEnv = process.env.NODE_ENV;

afterEach(async () => {
  await app?.close();
  app = undefined;
  process.env.NODE_ENV = originalEnv;
});

describe("공통 에러 형식", () => {
  it("없는 경로는 404 NOT_FOUND", async () => {
    app = await buildApp();
    const res = await app.inject({ method: "GET", url: "/api/nope" });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({
      error: { code: "NOT_FOUND", message: "요청한 리소스를 찾을 수 없습니다" },
    });
  });

  it("잘못된 요청 body는 400 VALIDATION_ERROR", async () => {
    app = await buildApp();
    const res = await app.inject({ method: "POST", url: "/api/auth/fake-login", payload: {} });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe("VALIDATION_ERROR");
  });
});

describe("인증", () => {
  it("쿠키 없이 /api/auth/me 요청하면 401", async () => {
    app = await buildApp();
    const res = await app.inject({ method: "GET", url: "/api/auth/me" });
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe("UNAUTHORIZED");
  });

  it("서명이 맞지 않는 쿠키는 401", async () => {
    app = await buildApp();
    const res = await app.inject({
      method: "GET",
      url: "/api/auth/me",
      cookies: { uid: "u-gwaneung.forged-signature" },
    });
    expect(res.statusCode).toBe(401);
  });
});

describe("/api/test/reset 등록 조건", () => {
  it("NODE_ENV=test가 아니면 라우트가 없다", async () => {
    process.env.NODE_ENV = "production";
    app = await buildApp();
    expect(app.hasRoute({ method: "POST", url: "/api/test/reset" })).toBe(false);
  });

  it("NODE_ENV=test이면 라우트가 등록된다", async () => {
    process.env.NODE_ENV = "test";
    app = await buildApp();
    expect(app.hasRoute({ method: "POST", url: "/api/test/reset" })).toBe(true);
  });
});

describe("CORS", () => {
  it("웹 출처의 DELETE preflight를 허용한다 (주문 취소)", async () => {
    app = await buildApp();
    const res = await app.inject({
      method: "OPTIONS",
      url: "/api/orders/00000000-0000-4000-8000-000000000000",
      headers: {
        origin: "http://localhost:3000",
        "access-control-request-method": "DELETE",
      },
    });
    expect(res.statusCode).toBe(204);
    expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:3000");
    expect(String(res.headers["access-control-allow-methods"])).toContain("DELETE");
    expect(res.headers["access-control-allow-credentials"]).toBe("true");
  });

  it("다른 출처는 허용하지 않는다", async () => {
    app = await buildApp();
    const res = await app.inject({
      method: "OPTIONS",
      url: "/api/menus",
      headers: { origin: "http://evil.example", "access-control-request-method": "GET" },
    });
    // 허용 출처를 고정 문자열로 응답하므로 브라우저가 출처 불일치로 차단한다.
    expect(res.headers["access-control-allow-origin"]).not.toBe("http://evil.example");
    expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:3000");
  });
});
