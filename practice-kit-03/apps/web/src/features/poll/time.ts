// 화면은 Asia/Seoul 기준 (PRD 7장). 후보 표시 형식: "YYYY-MM-DD HH:MM"

// 07:00 ~ 22:00, 30분 단위
export const TIME_SLOTS: string[] = Array.from({ length: (22 - 7) * 2 + 1 }, (_, i) => {
  const minutes = 7 * 60 + i * 30;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
});

export function toSeoulIso(date: string, time: string): string {
  return `${date}T${time}:00+09:00`;
}

const labelFmt = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function candidateLabel(iso: string): string {
  return labelFmt.format(new Date(iso));
}
