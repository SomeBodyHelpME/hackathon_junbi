import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { CreateReservationRequest, type Reservation, type ReservationListResponse } from "@kit/contracts";
import { AppError, parse } from "../../common/errors.js";
import { requireUser } from "../../common/auth.js";
import { hasPgCode, PG_EXCLUSION_VIOLATION } from "../../common/db-errors.js";
import { findByUser, insertReservation, roomExists } from "./repository.js";

// REQ-01에서는 "내 예약"(mine=true) 조회만 지원한다. 회의실·날짜별 조회는 REQ-03에서 추가.
const ListQuery = z.object({
  mine: z.literal("true", { error: "mine=true가 필요합니다" }),
});

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
    parse(ListQuery, req.query);
    const list = await findByUser(req.userId!);
    return list satisfies ReservationListResponse;
  });
}
