"use client";

import { AppShell } from "@/components/AppShell";
import { TeamList } from "@/components/TeamList";

export default function HomePage() {
  return (
    <AppShell>
      <TeamList />
    </AppShell>
  );
}
