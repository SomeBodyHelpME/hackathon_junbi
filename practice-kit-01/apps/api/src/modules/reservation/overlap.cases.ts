// 겹침 판정 사례표. 기존 예약 10:00~11:00 기준.
// 단위 테스트(overlap.test.ts)는 overlaps() 함수로, 통합 테스트(conflict.int.test.ts)는 실제 DB 제약으로 검증한다.
export const EXISTING = { start: "10:00", end: "11:00" };

export const OVERLAP_CASES: Array<[label: string, start: string, end: string, overlaps: boolean]> = [
  ["완전히 같음", "10:00", "11:00", true],
  ["뒤쪽 일부 겹침 (AC-05)", "10:30", "11:30", true],
  ["앞쪽 일부 겹침", "09:30", "10:30", true],
  ["안에 포함", "10:15", "10:45", true],
  ["감쌈", "09:00", "12:00", true],
  ["시작이 같고 더 짧음", "10:00", "10:30", true],
  ["끝이 같고 더 짧음", "10:30", "11:00", true],
  ["끝에 맞닿음 (AC-06)", "11:00", "12:00", false],
  ["시작에 맞닿음", "09:00", "10:00", false],
  ["완전히 뒤", "12:00", "13:00", false],
  ["완전히 앞", "08:00", "09:00", false],
];

export const at = (hhmm: string, date = "2099-12-01") => new Date(`${date}T${hhmm}:00+09:00`);
