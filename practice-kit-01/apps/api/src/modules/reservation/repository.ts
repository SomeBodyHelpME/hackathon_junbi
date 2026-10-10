import { and, asc, eq, gt, lt, sql } from "drizzle-orm";
import type { Reservation } from "@kit/contracts";
import { db } from "../../db/client.js";
import { reservations, rooms, users } from "../../db/schema.js";

const selectFields = {
  id: reservations.id,
  roomId: reservations.roomId,
  roomName: rooms.name,
  userId: reservations.userId,
  userName: users.name,
  title: reservations.title,
  startAt: reservations.startAt,
  endAt: reservations.endAt,
};

type Row = { [K in keyof typeof selectFields]: K extends "startAt" | "endAt" ? Date : string };

function toDto(row: Row): Reservation {
  return { ...row, startAt: row.startAt.toISOString(), endAt: row.endAt.toISOString() };
}

function baseQuery() {
  return db
    .select(selectFields)
    .from(reservations)
    .innerJoin(rooms, eq(reservations.roomId, rooms.id))
    .innerJoin(users, eq(reservations.userId, users.id));
}

export async function roomExists(roomId: string): Promise<boolean> {
  const [row] = await db.select({ id: rooms.id }).from(rooms).where(eq(rooms.id, roomId));
  return Boolean(row);
}

// 같은 회의실의 예약 생성을 트랜잭션 단위로 줄 세운다(advisory lock).
// exclusion constraint만 쓰면 겹치는 insert가 동시에 몰릴 때 deadlock(40P01)이 나서
// 일부 요청이 1초씩 지연된 뒤 500으로 실패한다. 겹침 차단 자체는 여전히 DB 제약이 보장한다.
export async function insertReservation(input: {
  roomId: string;
  userId: string;
  title: string;
  startAt: Date;
  endAt: Date;
}): Promise<Reservation> {
  const id = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${input.roomId}))`);
    const [created] = await tx.insert(reservations).values(input).returning({ id: reservations.id });
    return created.id;
  });
  const [row] = await baseQuery().where(eq(reservations.id, id));
  return toDto(row);
}

export async function findByUser(userId: string): Promise<Reservation[]> {
  const rows = await baseQuery()
    .where(eq(reservations.userId, userId))
    .orderBy(asc(reservations.startAt));
  return rows.map(toDto);
}

// Asia/Seoul 기준 하루 [00:00, 다음 날 00:00)와 겹치는 예약
export async function findByRoomAndDate(roomId: string, date: string): Promise<Reservation[]> {
  const dayStart = new Date(`${date}T00:00:00+09:00`);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  const rows = await baseQuery()
    .where(
      and(
        eq(reservations.roomId, roomId),
        lt(reservations.startAt, dayEnd),
        gt(reservations.endAt, dayStart),
      ),
    )
    .orderBy(asc(reservations.startAt));
  return rows.map(toDto);
}

export async function findOwner(id: string): Promise<{ userId: string } | undefined> {
  const [row] = await db
    .select({ userId: reservations.userId })
    .from(reservations)
    .where(eq(reservations.id, id));
  return row;
}

// 소유자 조건을 함께 걸어 삭제한다. 확인과 삭제 사이에 상태가 바뀌어도 타인 예약은 지워지지 않는다.
export async function deleteOwned(id: string, userId: string): Promise<boolean> {
  const deleted = await db
    .delete(reservations)
    .where(and(eq(reservations.id, id), eq(reservations.userId, userId)))
    .returning({ id: reservations.id });
  return deleted.length > 0;
}
