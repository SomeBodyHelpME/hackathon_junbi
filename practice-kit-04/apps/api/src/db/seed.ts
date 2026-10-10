import { db, pool } from "./client.js";
import { books, users } from "./schema.js";

// PRD 3장 시드 데이터. 여러 번 실행해도 중복되지 않는다.
const SEED_BOOKS = [
  { id: "b-1", title: "클린 코드", totalCopies: 2, availableCopies: 2 },
  { id: "b-2", title: "리팩터링", totalCopies: 1, availableCopies: 1 },
  { id: "b-3", title: "도메인 주도 설계", totalCopies: 1, availableCopies: 1 },
];

await db
  .insert(users)
  .values([
    { id: "u-sangeun", name: "상은" },
    { id: "u-gwaneung", name: "관응" },
    { id: "u-byeongwook", name: "병욱" },
  ])
  .onConflictDoNothing();

await db.insert(books).values(SEED_BOOKS).onConflictDoNothing();

console.log("seed done");
await pool.end();
