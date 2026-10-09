import Fastify from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import { registerErrorHandlers } from "./common/errors.js";
import { authRoutes } from "./modules/auth/routes.js";
import { roomRoutes } from "./modules/rooms/routes.js";
import { testRoutes } from "./modules/test/routes.js";

export const WEB_ORIGIN = process.env.WEB_ORIGIN ?? "http://localhost:3000";
const COOKIE_SECRET = process.env.COOKIE_SECRET ?? "dev-only-cookie-secret-change-me";

export async function buildApp(opts: { logger?: boolean } = {}) {
  const app = Fastify({ logger: opts.logger ?? false });

  await app.register(cors, { origin: WEB_ORIGIN, credentials: true });
  await app.register(cookie, { secret: COOKIE_SECRET });
  registerErrorHandlers(app);

  await app.register(authRoutes);
  await app.register(roomRoutes);

  // 운영 환경에서는 라우트 자체를 등록하지 않는다 → 404.
  if (process.env.NODE_ENV === "test") {
    await app.register(testRoutes);
  }

  return app;
}
