"use client";

import { useEffect, useState } from "react";
import type { ReservationListResponse, RoomListResponse } from "@kit/contracts";
import { apiFetch } from "@/lib/api";
import { MyReservationList } from "./MyReservationList";
import { ReservationForm } from "./ReservationForm";

const fetchRooms = () => apiFetch<RoomListResponse>("/api/rooms");
const fetchMine = () => apiFetch<ReservationListResponse>("/api/reservations?mine=true");

export function ReservationPage() {
  const [rooms, setRooms] = useState<RoomListResponse | null>(null);
  const [mine, setMine] = useState<ReservationListResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchRooms(), fetchMine()])
      .then(([r, m]) => {
        setRooms(r);
        setMine(m);
      })
      .catch((e: Error) => setLoadError(e.message));
  }, []);

  function refreshMine() {
    fetchMine()
      .then(setMine)
      .catch((e: Error) => setLoadError(e.message));
  }

  if (loadError) return <p role="alert">{loadError}</p>;
  if (!rooms || !mine) return <p>불러오는 중…</p>;

  return (
    <>
      <ReservationForm rooms={rooms} onCreated={refreshMine} />
      <MyReservationList reservations={mine} />
    </>
  );
}
