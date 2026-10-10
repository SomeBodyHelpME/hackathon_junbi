"use client";

import { useState } from "react";
import type { Reservation } from "@kit/contracts";
import { CancelButton } from "./CancelButton";
import { formatRange } from "./time";

// 로딩이 끝난 뒤에만 렌더링된다 (부모가 보장). 빈 목록도 <ul>은 항상 그린다.
export function MyReservationList({
  reservations,
  onChanged,
}: {
  reservations: Reservation[];
  onChanged: () => void;
}) {
  const [error, setError] = useState<string | null>(null);

  return (
    <section className="rounded-lg border bg-white p-6">
      <h2 className="mb-4 text-lg font-semibold">내 예약</h2>
      {error && (
        <p role="alert" className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <ul aria-label="내 예약" className="flex flex-col gap-2">
        {reservations.map((r) => (
          <li key={r.id} className="flex items-center justify-between rounded border p-3">
            <div>
              <p className="font-medium">{r.title}</p>
              <p className="text-sm text-gray-500">
                {r.roomName} · {formatRange(r.startAt, r.endAt)}
              </p>
            </div>
            <CancelButton
              reservationId={r.id}
              onCancelled={() => {
                setError(null);
                onChanged();
              }}
              onError={setError}
            />
          </li>
        ))}
      </ul>
      {reservations.length === 0 && <p className="text-sm text-gray-500">예약이 없습니다.</p>}
    </section>
  );
}
