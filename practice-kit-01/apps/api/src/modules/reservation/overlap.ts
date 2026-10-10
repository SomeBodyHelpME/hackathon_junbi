// 겹침 판정: 시작 포함, 끝 미포함 [start, end).
// 끝과 시작이 맞닿는 경우(10:00~11:00 / 11:00~12:00)는 겹치지 않는다 (AC-06).
// DB의 exclusion constraint(tstzrange '[)' &&)와 같은 규칙이다.
export type TimeRange = { start: Date; end: Date };

export function overlaps(a: TimeRange, b: TimeRange): boolean {
  return a.start < b.end && a.end > b.start;
}
