import { db, pool } from "./client.js";
import { menus, users } from "./schema.js";

// PRD 3장 시드 데이터. 여러 번 실행해도 중복되지 않는다.
await db
  .insert(users)
  .values([
    { id: "u-sangeun", name: "상은" },
    { id: "u-gwaneung", name: "관응" },
    { id: "u-byeongwook", name: "병욱" },
  ])
  .onConflictDoNothing();

await db
  .insert(menus)
  .values([
    { id: "m-1", name: "김치찌개", price: 9000 },
    { id: "m-2", name: "된장찌개", price: 8500 },
    { id: "m-3", name: "제육볶음", price: 10000 },
  ])
  .onConflictDoNothing();

console.log("seed done");
await pool.end();
