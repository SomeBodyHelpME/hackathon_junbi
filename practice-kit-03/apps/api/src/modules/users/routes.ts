import type { FastifyInstance } from "fastify";
import { asc } from "drizzle-orm";
import type { UserListResponse } from "@kit/contracts";
import { db } from "../../db/client.js";
import { users } from "../../db/schema.js";

export async function userRoutes(app: FastifyInstance) {
  app.get("/api/users", async () => {
    const rows = await db.select().from(users).orderBy(asc(users.id));
    return rows satisfies UserListResponse;
  });
}
