import type { FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import { polls } from "../../db/schema.js";

// 테스트 전용: 투표·후보·응답을 초기화한다 (ON DELETE CASCADE). 시드인 사용자는 유지.
// app.ts에서 NODE_ENV=test일 때만 등록된다.
export async function testRoutes(app: FastifyInstance) {
  app.post("/api/test/reset", async (_req, reply) => {
    await db.delete(polls);
    return reply.status(204).send();
  });
}
