"use client";

import { useEffect, useState } from "react";
import type { ReservationListResponse, Room, RoomListResponse } from "@kit/contracts";
import { apiFetch } from "@/lib/api";
import { useUser } from "@/components/AppShell";
import { CancelButton } from "./CancelButton";
import { formatRange, todayInSeoul } from "./time";

type Loaded = { key: string; list: ReservationListResponse };

// 회의실·날짜별 예약 현황. 본인 예약에만 취소 버튼을 보여 준다 (AC-09, UX).
export function RoomSchedule({ roomId }: { roomId: string }) {
  const user = useUser();
  const [room, setRoom] = useState<Room | null>(null);
  const [date, setDate] = useState(todayInSeoul());
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<RoomListResponse>("/api/rooms")
      .then((rooms) => setRoom(rooms.find((r) => r.id === roomId) ?? null))
      .catch((e: Error) => setError(e.message));
  }, [roomId]);

  // 조회 키(회의실+날짜+재조회 횟수)가 바뀌면 다시 불러온다.
  // 응답의 key가 현재 key와 다르면 이전 요청의 결과이므로 목록을 그리지 않는다 (로딩 중 표시).
  const key = `${roomId}|${date}|${reloadToken}`;
  useEffect(() => {
    if (!date) return;
    const params = new URLSearchParams({ roomId, date });
    apiFetch<ReservationListResponse>(`/api/reservations?${params}`)
      .then((list) => setLoaded({ key, list }))
      .catch((e: Error) => setError(e.message));
  }, [key, roomId, date]);

  const list = loaded?.key === key ? loaded.list : null;

  return (
    <section className="rounded-lg border bg-white p-6">
      <h2 className="mb-4 text-lg font-semibold">{room ? `${room.name} 예약 현황` : "예약 현황"}</h2>

      <label className="mb-4 flex max-w-xs flex-col gap-1">
        <span className="text-sm text-gray-600">날짜</span>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded border px-3 py-2"
        />
      </label>

      {error && (
        <p role="alert" className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {!date && <p className="text-sm text-gray-500">날짜를 선택하세요.</p>}
      {date && !list && <p>불러오는 중…</p>}
      {list && (
        <>
          <ul aria-label="예약 현황" className="flex flex-col gap-2">
            {list.map((r) => (
              <li key={r.id} className="flex items-center justify-between rounded border p-3">
                <div>
                  <p className="font-medium">{r.title}</p>
                  <p className="text-sm text-gray-500">
                    {formatRange(r.startAt, r.endAt)} · {r.userName}
                  </p>
                </div>
                {r.userId === user.id && (
                  <CancelButton
                    reservationId={r.id}
                    onCancelled={() => {
                      setError(null);
                      setReloadToken((n) => n + 1);
                    }}
                    onError={setError}
                  />
                )}
              </li>
            ))}
          </ul>
          {list.length === 0 && <p className="text-sm text-gray-500">예약이 없습니다.</p>}
        </>
      )}
    </section>
  );
}
