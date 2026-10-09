import { createBdd } from "playwright-bdd";

export const { Given, When, Then, Before } = createBdd();

export const API_URL = process.env.API_URL ?? "http://localhost:4000";

// 시드 데이터(PRD 3장). .feature에는 이름을 쓰고, API에는 id를 보낸다.
const SEED_USERS: Record<string, string> = {
  상은: "u-sangeun",
  관응: "u-gwaneung",
};

const SEED_ROOMS: Record<string, string> = {
  한라: "r-1",
  백두: "r-2",
  지리: "r-3",
};

export function userIdOf(name: string): string {
  const id = SEED_USERS[name];
  if (!id) throw new Error(`시드에 없는 사용자: ${name}`);
  return id;
}

export function roomIdOf(name: string): string {
  const id = SEED_ROOMS[name];
  if (!id) throw new Error(`시드에 없는 회의실: ${name}`);
  return id;
}
