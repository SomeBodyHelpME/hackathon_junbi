// 오늘 날짜 (Asia/Seoul) "YYYY-MM-DD"
const dateFmt = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul", dateStyle: "short" });

export function todayInSeoul(): string {
  return dateFmt.format(new Date());
}
