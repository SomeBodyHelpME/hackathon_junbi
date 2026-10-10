// 화면은 Asia/Seoul 기준 (PRD 6장).

// 07:00 ~ 22:00, 30분 단위
export const TIME_SLOTS: string[] = Array.from({ length: (22 - 7) * 2 + 1 }, (_, i) => {
  const minutes = 7 * 60 + i * 30;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
});

// "2099-12-01" + "10:00" → "2099-12-01T10:00:00+09:00"
export function toSeoulIso(date: string, time: string): string {
  return `${date}T${time}:00+09:00`;
}

const dateFmt = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul", dateStyle: "short" });
const timeFmt = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

// ISO → "2099-12-01 10:00–11:00"
export function formatRange(startAt: string, endAt: string): string {
  const start = new Date(startAt);
  const end = new Date(endAt);
  return `${dateFmt.format(start)} ${timeFmt.format(start)}–${timeFmt.format(end)}`;
}
