import type { FastifyInstance } from "fastify";
import { sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import { books, loans } from "../../db/schema.js";

// 테스트 전용: 대여 기록을 지우고 남은 권수를 보유 권수로 되돌린다 (사용자·도서 목록은 유지).
// app.ts에서 NODE_ENV=test일 때만 등록된다.
export async function testRoutes(app: FastifyInstance) {
  app.post("/api/test/reset", async (_req, reply) => {
    await db.transaction(async (tx) => {
      await tx.delete(loans);
      await tx.update(books).set({ availableCopies: sql`${books.totalCopies}` });
    });
    return reply.status(204).send();
  });
}
