import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  CreatePollRequest,
  POLL_MESSAGES,
  RespondRequest,
  type PollCreated,
  type PollDetail,
  type PollListResponse,
} from "@kit/contracts";
import { AppError, parse } from "../../common/errors.js";
import { requireUser } from "../../common/auth.js";
import { hasPgCode, PG_FOREIGN_KEY_VIOLATION, PG_UNIQUE_VIOLATION } from "../../common/db-errors.js";
import {
  findPoll,
  findPollDetail,
  insertPoll,
  InvalidCandidateError,
  listPolls,
  saveResponse,
} from "./repository.js";

const IdParams = z.object({ id: z.uuid() });

const pollNotFound = () => new AppError(404, "NOT_FOUND", "투표를 찾을 수 없습니다");
const invalidCandidate = () => new AppError(400, "INVALID_CANDIDATE", "이 투표의 후보가 아닙니다");

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
    const detail = await findPollDetail(pollIdFrom(req.params), req.userId!);
    if (!detail) throw pollNotFound();
    return detail satisfies PollDetail;
  });

  // 응답 저장/대체: 인증(401) → 투표 id(404) → 입력 검증(400) → 투표 존재(404) → 이 투표의 후보(400) → 200
  app.put("/api/polls/:id/response", { preHandler: requireUser }, async (req) => {
    const pollId = pollIdFrom(req.params);
    const { candidateIds } = parse(RespondRequest, req.body);
    if (!(await findPoll(pollId))) throw pollNotFound();
    try {
      await saveResponse(pollId, req.userId!, candidateIds);
    } catch (err) {
      if (err instanceof InvalidCandidateError || hasPgCode(err, PG_FOREIGN_KEY_VIOLATION)) {
        throw invalidCandidate();
      }
      throw err;
    }
    return (await findPollDetail(pollId, req.userId!)) satisfies PollDetail | undefined;
  });
}
