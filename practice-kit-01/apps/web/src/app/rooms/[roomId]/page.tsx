"use client";

import { useParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { RoomSchedule } from "@/features/reservation/RoomSchedule";

export default function RoomScheduleRoute() {
  const { roomId } = useParams<{ roomId: string }>();
  return (
    <AppShell>
      <RoomSchedule roomId={roomId} />
    </AppShell>
  );
}
