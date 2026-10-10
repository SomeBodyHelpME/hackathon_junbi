import type { FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import { orders, rounds } from "../../db/schema.js";

// 테스트 전용: 모집·주문만 초기화한다 (시드인 사용자/메뉴는 유지).
// app.ts에서 NODE_ENV=test일 때만 등록된다.
export async function testRoutes(app: FastifyInstance) {
  app.post("/api/test/reset", async (_req, reply) => {
    await db.delete(orders);
    await db.delete(rounds);
    return reply.status(204).send();
  });
}
