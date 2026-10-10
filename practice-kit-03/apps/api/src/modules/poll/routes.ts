import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { CreatePollRequest, POLL_MESSAGES, type PollCreated, type PollListResponse } from "@kit/contracts";
import { AppError, parse } from "../../common/errors.js";
import { requireUser } from "../../common/auth.js";
import { hasPgCode, PG_UNIQUE_VIOLATION } from "../../common/db-errors.js";
import { findPoll, insertPoll, listCandidates, listPolls } from "./repository.js";

const IdParams = z.object({ id: z.uuid() });

const pollNotFound = () => new AppError(404, "NOT_FOUND", "투표를 찾을 수 없습니다");

// UUID 형식이 아니면 DB 조회 없이 404
function pollIdFrom(params: unknown): string {
  const parsed = IdParams.safeParse(params);
  if (!parsed.success) throw pollNotFound();
  return parsed.data.id;
}

export async function pollRoutes(app: FastifyInstance) {
  app.get("/api/polls", { preHandler: requireUser }, async () => {
    return (await listPolls()) satisfies PollListResponse;
  });

  app.post("/api/polls", { preHandler: requireUser }, async (req, reply) => {
    const input = parse(CreatePollRequest, req.body);
    try {
      const created = await insertPoll({ ...input, createdBy: req.userId! });
      return reply.status(201).send(created satisfies PollCreated);
    } catch (err) {
      // 스키마 검증을 통과해도 DB 유니크 제약이 최종 방어선이다.
      if (hasPgCode(err, PG_UNIQUE_VIOLATION)) {
        throw new AppError(400, "VALIDATION_ERROR", POLL_MESSAGES.candidateDuplicate);
      }
      throw err;
    }
  });

  app.get("/api/polls/:id", { preHandler: requireUser }, async (req) => {
    const poll = await findPoll(pollIdFrom(req.params));
    if (!poll) throw pollNotFound();
    return { ...poll, candidates: await listCandidates(poll.id) };
  });
}
