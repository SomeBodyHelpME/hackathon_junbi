import { date, integer, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
});

export const menus = pgTable("menus", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  price: integer("price").notNull(),
});

// 점심 주문 모집. status: "open"(모집 중) | "closed"(마감)
export const rounds = pgTable("rounds", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  date: date("date").notNull(),
  createdBy: text("created_by")
    .notNull()
    .references(() => users.id),
  status: text("status", { enum: ["open", "closed"] }).notNull().default("open"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// 1인 1주문: (round_id, user_id) 유니크 제약으로 DB가 보장한다. 동시 요청에도 하나만 생성된다.
export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    roundId: uuid("round_id")
      .notNull()
      .references(() => rounds.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    menuId: text("menu_id")
      .notNull()
      .references(() => menus.id),
    quantity: integer("quantity").notNull(),
    memo: text("memo"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("orders_round_user_unique").on(t.roundId, t.userId)],
);
