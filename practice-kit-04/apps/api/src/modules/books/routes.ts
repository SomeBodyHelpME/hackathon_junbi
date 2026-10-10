import type { FastifyInstance } from "fastify";
import { asc } from "drizzle-orm";
import type { BookListResponse } from "@kit/contracts";
import { db } from "../../db/client.js";
import { books } from "../../db/schema.js";

// 도서 목록은 로그인 없이 볼 수 있다 (PRD 결정).
export async function bookRoutes(app: FastifyInstance) {
  app.get("/api/books", async () => {
    const rows = await db.select().from(books).orderBy(asc(books.id));
    return rows satisfies BookListResponse;
  });
}
