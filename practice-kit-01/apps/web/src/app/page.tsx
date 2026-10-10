"use client";

import { AppShell } from "@/components/AppShell";
import { RoomList } from "@/features/rooms/RoomList";

export default function HomePage() {
  return (
    <AppShell>
      <RoomList />
    </AppShell>
  );
}
