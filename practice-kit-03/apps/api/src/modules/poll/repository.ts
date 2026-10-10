import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import type { Candidate, Poll, PollCreated, PollDetail } from "@kit/contracts";
import { db } from "../../db/client.js";
import { candidates, polls, responseChoices, responses, users } from "../../db/schema.js";

const pollFields = {
  id: polls.id,
  title: polls.title,
  status: polls.status,
  createdBy: polls.createdBy,
  createdByName: users.name,
  confirmedCandidateId: polls.confirmedCandidateId,
};

function pollQuery() {
  return db.select(pollFields).from(polls).innerJoin(users, eq(polls.createdBy, users.id));
}

export async function listPolls(): Promise<Poll[]> {
  return pollQuery().orderBy(desc(polls.createdAt));
}

export async function findPoll(id: string): Promise<Poll | undefined> {
  const [row] = await pollQuery().where(eq(polls.id, id));
  return row;
}

export async function listCandidates(pollId: string): Promise<Candidate[]> {
  const rows = await db
    .select({ id: candidates.id, startsAt: candidates.startsAt })
    .from(candidates)
    .where(eq(candidates.pollId, pollId))
    .orderBy(asc(candidates.startsAt));
  return rows.map((c) => ({ id: c.id, startsAt: c.startsAt.toISOString() }));
}

// 투표와 후보를 한 트랜잭션으로 만든다. 후보 중복은 DB 유니크 제약(poll_id, starts_at)도 막는다.
export async function insertPoll(input: {
  title: string;
  createdBy: string;
  candidates: Array<{ startsAt: string }>;
}): Promise<PollCreated> {
  const id = await db.transaction(async (tx) => {
    const [poll] = await tx
      .insert(polls)
      .values({ title: input.title, createdBy: input.createdBy })
      .returning({ id: polls.id });
    await tx
      .insert(candidates)
      .values(input.candidates.map((c) => ({ pollId: poll.id, startsAt: new Date(c.startsAt) })));
    return poll.id;
  });
  return { ...(await findPoll(id))!, candidates: await listCandidates(id) };
}

// 후보별 가능 인원, 최다 득표 후보(동률 모두), 내 응답
export async function findPollDetail(id: string, viewerId: string): Promise<PollDetail | undefined> {
  const poll = await findPoll(id);
  if (!poll) return undefined;

  const rows = await db
    .select({
      id: candidates.id,
      startsAt: candidates.startsAt,
      count: sql<number>`count(${responseChoices.userId})::int`,
    })
    .from(candidates)
    .leftJoin(
      responseChoices,
      and(eq(responseChoices.pollId, candidates.pollId), eq(responseChoices.candidateId, candidates.id)),
    )
    .where(eq(candidates.pollId, id))
    .groupBy(candidates.id, candidates.startsAt)
    .orderBy(asc(candidates.startsAt));

  const max = Math.max(0, ...rows.map((r) => r.count));
  const mine = await db
    .select({ candidateId: responseChoices.candidateId })
    .from(responseChoices)
    .where(and(eq(responseChoices.pollId, id), eq(responseChoices.userId, viewerId)));

  return {
    ...poll,
    candidates: rows.map((r) => ({ id: r.id, startsAt: r.startsAt.toISOString(), count: r.count })),
    topCandidateIds: max > 0 ? rows.filter((r) => r.count === max).map((r) => r.id) : [],
    myChoices: mine.map((m) => m.candidateId),
  };
}

export class InvalidCandidateError extends Error {}

// 응답 저장/대체.
// 1) 후보가 모두 이 투표의 후보인지 확인 (DB 복합 FK도 같은 규칙으로 막는다)
// 2) responses 행을 upsert → 같은 사용자의 동시 제출은 이 행의 잠금에서 줄을 선다
// 3) 선택을 지우고 새로 넣는다 → 마지막 응답 하나만 남는다 (두 응답이 합쳐지지 않는다)
export async function saveResponse(pollId: string, userId: string, candidateIds: string[]): Promise<void> {
  const unique = [...new Set(candidateIds)];
  await db.transaction(async (tx) => {
    const owned = await tx
      .select({ id: candidates.id })
      .from(candidates)
      .where(and(eq(candidates.pollId, pollId), inArray(candidates.id, unique)));
    if (owned.length !== unique.length) throw new InvalidCandidateError();

    await tx
      .insert(responses)
      .values({ pollId, userId })
      .onConflictDoUpdate({ target: [responses.pollId, responses.userId], set: { updatedAt: sql`now()` } });
    await tx
      .delete(responseChoices)
      .where(and(eq(responseChoices.pollId, pollId), eq(responseChoices.userId, userId)));
    await tx.insert(responseChoices).values(unique.map((candidateId) => ({ pollId, userId, candidateId })));
  });
}
