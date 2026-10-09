import { db, pool } from "./client.js";
import { rooms, users } from "./schema.js";

// PRD 3장 시드 데이터. 여러 번 실행해도 중복되지 않는다.
await db
  .insert(users)
  .values([
    { id: "u-sangeun", name: "상은" },
    { id: "u-gwaneung", name: "관응" },
  ])
  .onConflictDoNothing();

await db
  .insert(rooms)
  .values([
    { id: "r-1", name: "한라", capacity: 4 },
    { id: "r-2", name: "백두", capacity: 8 },
    { id: "r-3", name: "지리", capacity: 12 },
  ])
  .onConflictDoNothing();

console.log("seed done");
await pool.end();
