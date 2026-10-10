import {
  foreignKey,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
});

// 일정 투표. status: "open"(투표 중) | "confirmed"(확정)
// confirmed_candidate_id → candidates(poll_id, id) 복합 FK는 REQ-03 커스텀 마이그레이션에서 추가한다.
export const polls = pgTable("polls", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  createdBy: text("created_by")
    .notNull()
    .references(() => users.id),
  status: text("status", { enum: ["open", "confirmed"] }).notNull().default("open"),
  confirmedCandidateId: uuid("confirmed_candidate_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// 후보 시간. 같은 투표 안에서 시작 일시는 중복될 수 없다.
// (poll_id, id) 유니크는 다른 테이블이 "이 투표의 후보"만 참조하도록 복합 FK 대상으로 쓴다.
export const candidates = pgTable(
  "candidates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pollId: uuid("poll_id")
      .notNull()
      .references(() => polls.id, { onDelete: "cascade" }),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  },
  (t) => [
    unique("candidates_poll_starts_unique").on(t.pollId, t.startsAt),
    unique("candidates_poll_id_unique").on(t.pollId, t.id),
  ],
);

// 응답: 투표당 1인 1행. 다시 제출하면 이 행을 upsert하고 선택을 교체한다.
export const responses = pgTable(
  "responses",
  {
    pollId: uuid("poll_id")
      .notNull()
      .references(() => polls.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.pollId, t.userId] })],
);

// 응답에서 "가능"으로 고른 후보. 후보는 반드시 같은 투표의 후보여야 한다 (복합 FK).
export const responseChoices = pgTable(
  "response_choices",
  {
    pollId: uuid("poll_id").notNull(),
    userId: text("user_id").notNull(),
    candidateId: uuid("candidate_id").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.pollId, t.userId, t.candidateId] }),
    foreignKey({ columns: [t.pollId, t.userId], foreignColumns: [responses.pollId, responses.userId] }).onDelete(
      "cascade",
    ),
    foreignKey({ columns: [t.pollId, t.candidateId], foreignColumns: [candidates.pollId, candidates.id] }).onDelete(
      "cascade",
    ),
  ],
);
