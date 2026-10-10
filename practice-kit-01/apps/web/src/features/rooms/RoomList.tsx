"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { RoomListResponse } from "@kit/contracts";
import { apiFetch } from "@/lib/api";

export function RoomList() {
  const [rooms, setRooms] = useState<RoomListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<RoomListResponse>("/api/rooms")
      .then(setRooms)
      .catch((e: Error) => setError(e.message));
  }, []);

  if (error) return <p role="alert">{error}</p>;
  if (!rooms) return <p>회의실을 불러오는 중…</p>;

  return (
    <section className="rounded-lg border bg-white p-6">
      <h2 className="mb-4 text-lg font-semibold">회의실</h2>
      <ul aria-label="회의실 목록" className="grid gap-2 sm:grid-cols-3">
        {rooms.map((room) => (
          <li key={room.id} className="rounded border p-3 hover:bg-gray-50">
            <Link href={`/rooms/${room.id}`} className="font-medium text-blue-700 hover:underline">
              {room.name}
            </Link>
            <span className="ml-2 text-sm text-gray-500">{room.capacity}인</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
