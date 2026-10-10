import { and, asc, desc, eq, sql } from "drizzle-orm";
import type { Order, Round, RoundDetail, RoundSummary } from "@kit/contracts";
import { db } from "../../db/client.js";
import { menus, orders, rounds, users } from "../../db/schema.js";

const roundFields = {
  id: rounds.id,
  title: rounds.title,
  date: rounds.date,
  status: rounds.status,
  createdBy: rounds.createdBy,
  createdByName: users.name,
};

function roundQuery() {
  return db.select(roundFields).from(rounds).innerJoin(users, eq(rounds.createdBy, users.id));
}

export async function listRounds(): Promise<Round[]> {
  return roundQuery().orderBy(desc(rounds.date), desc(rounds.createdAt));
}

export async function findRound(id: string): Promise<Round | undefined> {
  const [row] = await roundQuery().where(eq(rounds.id, id));
  return row;
}

export async function insertRound(input: { title: string; date: string; createdBy: string }): Promise<Round> {
  const [{ id }] = await db.insert(rounds).values(input).returning({ id: rounds.id });
  return (await findRound(id))!;
}

// 금액은 DB의 메뉴 가격으로 계산한다 (클라이언트 값을 쓰지 않는다).
const orderFields = {
  id: orders.id,
  roundId: orders.roundId,
  userId: orders.userId,
  userName: users.name,
  menuId: orders.menuId,
  menuName: menus.name,
  quantity: orders.quantity,
  price: menus.price,
  memo: orders.memo,
};

function orderQuery() {
  return db
    .select(orderFields)
    .from(orders)
    .innerJoin(users, eq(orders.userId, users.id))
    .innerJoin(menus, eq(orders.menuId, menus.id));
}

function toOrder({ price, ...row }: { price: number } & Omit<Order, "amount">): Order {
  return { ...row, amount: price * row.quantity };
}

export async function findOrder(id: string): Promise<Order | undefined> {
  const [row] = await orderQuery().where(eq(orders.id, id));
  return row && toOrder(row);
}

export async function listOrders(roundId: string): Promise<Order[]> {
  const rows = await orderQuery().where(eq(orders.roundId, roundId)).orderBy(asc(orders.createdAt));
  return rows.map(toOrder);
}

// 메뉴별 합계는 DB에서 집계한다. 금액 = DB 메뉴 가격 × 수량.
export async function summarize(roundId: string): Promise<RoundSummary> {
  const items = await db
    .select({
      menuId: menus.id,
      menuName: menus.name,
      quantity: sql<number>`sum(${orders.quantity})::int`,
      amount: sql<number>`sum(${orders.quantity} * ${menus.price})::int`,
    })
    .from(orders)
    .innerJoin(menus, eq(orders.menuId, menus.id))
    .where(eq(orders.roundId, roundId))
    .groupBy(menus.id, menus.name)
    .orderBy(asc(menus.id));
  return { items, total: items.reduce((sum, i) => sum + i.amount, 0) };
}

export async function findRoundDetail(id: string): Promise<RoundDetail | undefined> {
  const round = await findRound(id);
  if (!round) return undefined;
  const [orderList, summary] = await Promise.all([listOrders(id), summarize(id)]);
  return { ...round, orders: orderList, summary };
}

// 모집 중일 때만 마감한다. 이미 마감이면 false.
export async function closeRound(id: string): Promise<boolean> {
  const updated = await db
    .update(rounds)
    .set({ status: "closed" })
    .where(and(eq(rounds.id, id), eq(rounds.status, "open")))
    .returning({ id: rounds.id });
  return updated.length > 0;
}

export async function menuExists(menuId: string): Promise<boolean> {
  const [row] = await db.select({ id: menus.id }).from(menus).where(eq(menus.id, menuId));
  return Boolean(row);
}

export class RoundClosedError extends Error {}

// 모집 행을 FOR SHARE로 잠근 뒤 상태를 확인하고 저장한다.
// 마감(UPDATE)은 이 트랜잭션이 끝날 때까지 기다리므로, "열림 확인 → 마감 → 저장" 순서가 생기지 않는다.
export async function insertOrder(input: {
  roundId: string;
  userId: string;
  menuId: string;
  quantity: number;
  memo?: string;
}): Promise<Order> {
  const id = await db.transaction(async (tx) => {
    const [round] = await tx
      .select({ status: rounds.status })
      .from(rounds)
      .where(eq(rounds.id, input.roundId))
      .for("share");
    if (!round || round.status !== "open") throw new RoundClosedError();
    const [created] = await tx.insert(orders).values(input).returning({ id: orders.id });
    return created.id;
  });
  return (await findOrder(id))!;
}

export type CancelResult = "deleted" | "not_found" | "forbidden" | "closed";

// 주문 취소: 모집 행을 FOR SHARE로 잠가 마감과 동시에 일어나도 순서를 보장한다.
// 검사 순서: 주문 존재(404) → 본인(403) → 모집 중(409). 삭제는 id + user_id 조건으로 한다.
export async function cancelOrder(orderId: string, userId: string): Promise<CancelResult> {
  return db.transaction(async (tx) => {
    const [order] = await tx
      .select({ userId: orders.userId, roundId: orders.roundId })
      .from(orders)
      .where(eq(orders.id, orderId));
    if (!order) return "not_found";
    if (order.userId !== userId) return "forbidden";

    const [round] = await tx
      .select({ status: rounds.status })
      .from(rounds)
      .where(eq(rounds.id, order.roundId))
      .for("share");
    if (round?.status !== "open") return "closed";

    const deleted = await tx
      .delete(orders)
      .where(and(eq(orders.id, orderId), eq(orders.userId, userId)))
      .returning({ id: orders.id });
    return deleted.length > 0 ? "deleted" : "not_found";
  });
}
