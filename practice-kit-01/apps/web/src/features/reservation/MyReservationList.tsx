"use client";

import type { Reservation } from "@kit/contracts";
import { formatRange } from "./time";

// 로딩이 끝난 뒤에만 렌더링된다 (부모가 보장). 빈 목록도 <ul>은 항상 그린다.
export function MyReservationList({ reservations }: { reservations: Reservation[] }) {
  return (
    <section className="rounded-lg border bg-white p-6">
      <h2 className="mb-4 text-lg font-semibold">내 예약</h2>
      <ul aria-label="내 예약" className="flex flex-col gap-2">
        {reservations.map((r) => (
          <li key={r.id} className="flex items-center justify-between rounded border p-3">
            <div>
              <p className="font-medium">{r.title}</p>
              <p className="text-sm text-gray-500">
                {r.roomName} · {formatRange(r.startAt, r.endAt)}
              </p>
            </div>
          </li>
        ))}
      </ul>
      {reservations.length === 0 && <p className="text-sm text-gray-500">예약이 없습니다.</p>}
    </section>
  );
}
