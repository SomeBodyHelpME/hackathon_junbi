import { sql } from "drizzle-orm";
import { boolean, check, date, integer, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
});

// 남은 권수(available_copies)는 대여·반납 시 원자적 UPDATE로 증감한다.
// CHECK로 0 미만·보유 권수 초과를 DB가 막는다 (재고가 음수가 되지 않는다).
export const books = pgTable(
  "books",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    totalCopies: integer("total_copies").notNull(),
    availableCopies: integer("available_copies").notNull(),
  },
  (t) => [check("books_available_range", sql`${t.availableCopies} between 0 and ${t.totalCopies}`)],
);

// 대여. returned_at이 NULL이면 대여 중. 날짜(borrowed_on, due_on)는 Asia/Seoul 기준.
// 같은 사람이 같은 책을 동시에 두 번 빌릴 수 없다: 대여 중인 행에만 걸리는 부분 유니크 인덱스.
export const loans = pgTable(
  "loans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    bookId: text("book_id")
      .notNull()
      .references(() => books.id),
    borrowedOn: date("borrowed_on").notNull(),
    dueOn: date("due_on").notNull(),
    extended: boolean("extended").notNull().default(false),
    returnedAt: timestamp("returned_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("loans_active_user_book_unique")
      .on(t.userId, t.bookId)
      .where(sql`${t.returnedAt} is null`),
  ],
);
