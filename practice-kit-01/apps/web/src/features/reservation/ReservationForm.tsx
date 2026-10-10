"use client";

import { useState, type FormEvent } from "react";
import { CreateReservationRequest, type Reservation, type Room } from "@kit/contracts";
import { apiFetch } from "@/lib/api";
import { TIME_SLOTS, toSeoulIso } from "./time";

type Props = {
  rooms: Room[];
  onCreated: (reservation: Reservation) => void;
};

export function ReservationForm({ rooms, onCreated }: Props) {
  const [roomId, setRoomId] = useState(rooms[0]?.id ?? "");
  const [date, setDate] = useState("");
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("10:00");
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const payload = {
      roomId,
      title,
      startAt: toSeoulIso(date, start),
      endAt: toSeoulIso(date, end),
    };

    // UX 보조: 서버와 같은 스키마로 먼저 검사한다. 최종 검증은 서버가 한다.
    const parsed = CreateReservationRequest.safeParse(payload);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "입력값을 확인하세요");
      return;
    }

    setSubmitting(true);
    try {
      const created = await apiFetch<Reservation>("/api/reservations", {
        method: "POST",
        body: JSON.stringify(parsed.data),
      });
      setTitle("");
      onCreated(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : "예약하지 못했습니다");
    } finally {
      setSubmitting(false);
    }
  }

  const fieldClass = "w-full rounded border px-3 py-2";

  // required 속성을 쓰지 않는다: 브라우저 기본 말풍선이 뜨면 role="alert" 메시지가 표시되지 않는다.
  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-4 rounded-lg border bg-white p-6 sm:grid-cols-2">
      <h2 className="text-lg font-semibold sm:col-span-2">새 예약</h2>

      <label className="flex flex-col gap-1">
        <span className="text-sm text-gray-600">회의실</span>
        <select value={roomId} onChange={(e) => setRoomId(e.target.value)} className={fieldClass}>
          {rooms.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm text-gray-600">날짜</span>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={fieldClass} />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm text-gray-600">시작 시각</span>
        <select value={start} onChange={(e) => setStart(e.target.value)} className={fieldClass}>
          {TIME_SLOTS.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm text-gray-600">종료 시각</span>
        <select value={end} onChange={(e) => setEnd(e.target.value)} className={fieldClass}>
          {TIME_SLOTS.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 sm:col-span-2">
        <span className="text-sm text-gray-600">제목</span>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className={fieldClass} />
      </label>

      {error && (
        <p role="alert" className="rounded bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-2">
          {error}
        </p>
      )}

      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          예약하기
        </button>
      </div>
    </form>
  );
}
