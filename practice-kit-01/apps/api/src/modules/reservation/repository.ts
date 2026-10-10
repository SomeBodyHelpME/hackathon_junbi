import { asc, eq } from "drizzle-orm";
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

export async function insertReservation(input: {
  roomId: string;
  userId: string;
  title: string;
  startAt: Date;
  endAt: Date;
}): Promise<Reservation> {
  const [{ id }] = await db.insert(reservations).values(input).returning({ id: reservations.id });
  const [row] = await baseQuery().where(eq(reservations.id, id));
  return toDto(row);
}

export async function findByUser(userId: string): Promise<Reservation[]> {
  const rows = await baseQuery()
    .where(eq(reservations.userId, userId))
    .orderBy(asc(reservations.startAt));
  return rows.map(toDto);
}
