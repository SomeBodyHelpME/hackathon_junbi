import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
});

export const rooms = pgTable("rooms", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  capacity: integer("capacity").notNull(),
});

// 구조만 정의한다. 예약 API/화면은 REQ-01에서 구현.
// /api/test/reset이 초기화할 대상이라 REQ-00에서 테이블을 먼저 만든다.
export const reservations = pgTable("reservations", {
  id: uuid("id").primaryKey().defaultRandom(),
  roomId: text("room_id")
    .notNull()
    .references(() => rooms.id),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  title: text("title").notNull(),
  startAt: timestamp("start_at", { withTimezone: true }).notNull(),
  endAt: timestamp("end_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
