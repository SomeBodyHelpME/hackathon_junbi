import { asc, desc, eq } from "drizzle-orm";
import type { Order, Round, RoundDetail } from "@kit/contracts";
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

export async function findRoundDetail(id: string): Promise<RoundDetail | undefined> {
  const round = await findRound(id);
  if (!round) return undefined;
  return { ...round, orders: await listOrders(id) };
}

export async function menuExists(menuId: string): Promise<boolean> {
  const [row] = await db.select({ id: menus.id }).from(menus).where(eq(menus.id, menuId));
  return Boolean(row);
}

export async function insertOrder(input: {
  roundId: string;
  userId: string;
  menuId: string;
  quantity: number;
  memo?: string;
}): Promise<Order> {
  const [{ id }] = await db.insert(orders).values(input).returning({ id: orders.id });
  return (await findOrder(id))!;
}
