import type { FastifyReply, FastifyRequest } from "fastify";
import { AppError } from "./errors.js";

export const SESSION_COOKIE = "uid";

// 서명된 세션 쿠키에서 userId를 꺼낸다. 없거나 위조됐으면 null.
export function getSessionUserId(req: FastifyRequest): string | null {
  const raw = req.cookies[SESSION_COOKIE];
  if (!raw) return null;
  const result = req.unsignCookie(raw);
  return result.valid ? result.value : null;
}

// 로그인이 필요한 라우트의 preHandler. 비로그인이면 401.
export async function requireUser(req: FastifyRequest, _reply: FastifyReply) {
  const userId = getSessionUserId(req);
  if (!userId) {
    throw new AppError(401, "UNAUTHORIZED", "로그인이 필요합니다");
  }
  req.userId = userId;
}

declare module "fastify" {
  interface FastifyRequest {
    userId?: string;
  }
}
