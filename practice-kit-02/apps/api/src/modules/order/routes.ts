import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  CreateOrderRequest,
  CreateRoundRequest,
  type Order,
  type Round,
  type RoundDetail,
  type RoundListResponse,
} from "@kit/contracts";
import { AppError, parse } from "../../common/errors.js";
import { requireUser } from "../../common/auth.js";
import { hasPgCode, PG_UNIQUE_VIOLATION } from "../../common/db-errors.js";
import {
  findRound,
  findRoundDetail,
  insertOrder,
  insertRound,
  listRounds,
  menuExists,
} from "./repository.js";

const IdParams = z.object({ id: z.uuid() });

const roundNotFound = () => new AppError(404, "NOT_FOUND", "모집을 찾을 수 없습니다");

// UUID 형식이 아니면 DB 조회 없이 404
function roundIdFrom(params: unknown): string {
  const parsed = IdParams.safeParse(params);
  if (!parsed.success) throw roundNotFound();
  return parsed.data.id;
}

export async function orderRoutes(app: FastifyInstance) {
  // ── 모집 ──
  app.get("/api/rounds", { preHandler: requireUser }, async () => {
    return (await listRounds()) satisfies RoundListResponse;
  });

  app.post("/api/rounds", { preHandler: requireUser }, async (req, reply) => {
    const input = parse(CreateRoundRequest, req.body);
    const created = await insertRound({ ...input, createdBy: req.userId! });
    return reply.status(201).send(created satisfies Round);
  });

  app.get("/api/rounds/:id", { preHandler: requireUser }, async (req) => {
    const detail = await findRoundDetail(roundIdFrom(req.params));
    if (!detail) throw roundNotFound();
    return detail satisfies RoundDetail;
  });

  // ── 주문 ──
  // 순서: 인증(401) → 모집 id(404) → 입력 검증(400) → 모집 존재(404) → 메뉴 존재(400) → 저장(201 / 409)
  app.post("/api/rounds/:id/orders", { preHandler: requireUser }, async (req, reply) => {
    const roundId = roundIdFrom(req.params);
    const input = parse(CreateOrderRequest, req.body);

    const round = await findRound(roundId);
    if (!round) throw roundNotFound();
    if (!(await menuExists(input.menuId))) {
      throw new AppError(400, "INVALID_MENU", "존재하지 않는 메뉴입니다");
    }

    // 1인 1주문은 DB 유니크 제약이 보장한다 (조회 후 저장은 동시 요청에 뚫린다).
    try {
      const created = await insertOrder({ ...input, roundId, userId: req.userId! });
      return reply.status(201).send(created satisfies Order);
    } catch (err) {
      if (hasPgCode(err, PG_UNIQUE_VIOLATION)) {
        throw new AppError(409, "ORDER_DUPLICATE", "이미 주문했습니다");
      }
      throw err;
    }
  });
}
