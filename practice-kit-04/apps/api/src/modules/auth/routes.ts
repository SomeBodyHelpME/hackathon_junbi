import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { FakeLoginRequest, type User } from "@kit/contracts";
import { db } from "../../db/client.js";
import { users } from "../../db/schema.js";
import { AppError, parse } from "../../common/errors.js";
import { requireUser, SESSION_COOKIE } from "../../common/auth.js";

export async function authRoutes(app: FastifyInstance) {
  app.post("/api/auth/fake-login", async (req, reply) => {
    const { userId } = parse(FakeLoginRequest, req.body);
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) {
      throw new AppError(400, "INVALID_USER", "존재하지 않는 사용자입니다");
    }
    reply.setCookie(SESSION_COOKIE, user.id, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      signed: true,
    });
    return user satisfies User;
  });

  app.post("/api/auth/logout", async (_req, reply) => {
    reply.clearCookie(SESSION_COOKIE, { path: "/" });
    return reply.status(204).send();
  });

  app.get("/api/auth/me", { preHandler: requireUser }, async (req) => {
    const [user] = await db.select().from(users).where(eq(users.id, req.userId!));
    if (!user) {
      throw new AppError(401, "UNAUTHORIZED", "로그인이 필요합니다");
    }
    return user satisfies User;
  });
}
