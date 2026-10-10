// 반납 기한 계산. 날짜는 Asia/Seoul 기준 "YYYY-MM-DD".
const seoulDate = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul", dateStyle: "short" });

// 주어진 순간의 서울 날짜. 예: 2099-12-01T15:30Z → "2099-12-02" (서울은 이미 다음 날 00:30)
export function seoulDateOf(instant: Date): string {
  return seoulDate.format(instant);
}

// "YYYY-MM-DD" + days → "YYYY-MM-DD" (월·연 경계 포함, 시간대 영향 없음)
export function addDays(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}
