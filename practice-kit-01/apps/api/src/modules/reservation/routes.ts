import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  CreateReservationRequest,
  ReservationListQuery,
  type Reservation,
  type ReservationListResponse,
} from "@kit/contracts";
import { AppError, parse } from "../../common/errors.js";
import { requireUser } from "../../common/auth.js";
import { hasPgCode, PG_EXCLUSION_VIOLATION } from "../../common/db-errors.js";
import {
  deleteOwned,
  findByRoomAndDate,
  findByUser,
  findOwner,
  insertReservation,
  roomExists,
} from "./repository.js";

const IdParams = z.object({ id: z.uuid() });

const notFound = () => new AppError(404, "NOT_FOUND", "예약을 찾을 수 없습니다");

export async function reservationRoutes(app: FastifyInstance) {
  app.post("/api/reservations", { preHandler: requireUser }, async (req, reply) => {
    // 백엔드 검증: 프론트 검증과 관계없이 항상 수행한다.
    const input = parse(CreateReservationRequest, req.body);

    if (!(await roomExists(input.roomId))) {
      throw new AppError(400, "INVALID_ROOM", "존재하지 않는 회의실입니다");
    }

    // 겹침 검사는 DB exclusion constraint가 수행한다 (drizzle/0001_no_overlap.sql).
    // 조회 후 저장 방식은 동시 요청 사이에 틈이 생기므로 쓰지 않는다.
    try {
      const created = await insertReservation({
        roomId: input.roomId,
        userId: req.userId!,
        title: input.title,
        startAt: new Date(input.startAt),
        endAt: new Date(input.endAt),
      });
      return reply.status(201).send(created satisfies Reservation);
    } catch (err) {
      if (hasPgCode(err, PG_EXCLUSION_VIOLATION)) {
        throw new AppError(409, "RESERVATION_CONFLICT", "이미 예약된 시간입니다");
      }
      throw err;
    }
  });

  app.get("/api/reservations", { preHandler: requireUser }, async (req) => {
    const query = parse(ReservationListQuery, req.query);
    const list =
      "mine" in query
        ? await findByUser(req.userId!)
        : await findByRoomAndDate(query.roomId, query.date);
    return list satisfies ReservationListResponse;
  });

  // 권한 검사는 반드시 여기(API 핸들러)에서 한다. 화면의 버튼 숨김은 UX일 뿐 보안이 아니다.
  // 순서: 인증(401, preHandler) → 대상 존재(404) → 소유자(403) → 삭제(204)
  app.delete("/api/reservations/:id", { preHandler: requireUser }, async (req, reply) => {
    const params = IdParams.safeParse(req.params);
    if (!params.success) throw notFound();

    const owner = await findOwner(params.data.id);
    if (!owner) throw notFound();
    if (owner.userId !== req.userId) {
      throw new AppError(403, "FORBIDDEN", "본인 예약만 취소할 수 있습니다");
    }

    if (!(await deleteOwned(params.data.id, req.userId!))) throw notFound();
    return reply.status(204).send();
  });
}
