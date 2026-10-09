import type { FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import { reservations } from "../../db/schema.js";

// 테스트 전용: 예약 데이터만 초기화한다 (시드인 사용자/회의실은 유지).
// app.ts에서 NODE_ENV=test일 때만 등록된다.
export async function testRoutes(app: FastifyInstance) {
  app.post("/api/test/reset", async (_req, reply) => {
    await db.delete(reservations);
    return reply.status(204).send();
  });
}
