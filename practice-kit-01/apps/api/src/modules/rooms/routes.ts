import type { FastifyInstance } from "fastify";
import { asc } from "drizzle-orm";
import type { RoomListResponse } from "@kit/contracts";
import { db } from "../../db/client.js";
import { rooms } from "../../db/schema.js";

export async function roomRoutes(app: FastifyInstance) {
  app.get("/api/rooms", async () => {
    const rows = await db.select().from(rooms).orderBy(asc(rooms.id));
    return rows satisfies RoomListResponse;
  });
}
