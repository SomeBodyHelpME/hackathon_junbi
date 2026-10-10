import type { FastifyInstance } from "fastify";
import { asc } from "drizzle-orm";
import type { MenuListResponse } from "@kit/contracts";
import { db } from "../../db/client.js";
import { menus } from "../../db/schema.js";

export async function menuRoutes(app: FastifyInstance) {
  app.get("/api/menus", async () => {
    const rows = await db.select().from(menus).orderBy(asc(menus.id));
    return rows satisfies MenuListResponse;
  });
}
