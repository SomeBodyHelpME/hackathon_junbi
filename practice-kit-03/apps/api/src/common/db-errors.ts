// PostgreSQL 오류 코드. Drizzle은 드라이버 오류를 cause로 감싸므로 cause 체인을 따라간다.
export const PG_EXCLUSION_VIOLATION = "23P01";

export function hasPgCode(err: unknown, code: string): boolean {
  let cur: unknown = err;
  for (let depth = 0; cur && depth < 5; depth++) {
    if (typeof cur === "object" && "code" in cur && (cur as { code: unknown }).code === code) {
      return true;
    }
    cur = (cur as { cause?: unknown }).cause;
  }
  return false;
}
export const PG_UNIQUE_VIOLATION = "23505";
export const PG_FOREIGN_KEY_VIOLATION = "23503";
