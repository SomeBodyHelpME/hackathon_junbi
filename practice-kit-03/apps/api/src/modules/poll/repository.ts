import { asc, desc, eq } from "drizzle-orm";
import type { Candidate, Poll, PollCreated } from "@kit/contracts";
import { db } from "../../db/client.js";
import { candidates, polls, users } from "../../db/schema.js";

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
