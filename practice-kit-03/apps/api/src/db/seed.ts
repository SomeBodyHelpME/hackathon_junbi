import { db, pool } from "./client.js";
import { users } from "./schema.js";

// PRD 3장 시드 데이터. 여러 번 실행해도 중복되지 않는다.
await db
  .insert(users)
  .values([
    { id: "u-sangeun", name: "상은" },
    { id: "u-gwaneung", name: "관응" },
    { id: "u-byeongwook", name: "병욱" },
  ])
  .onConflictDoNothing();

console.log("seed done");
await pool.end();
