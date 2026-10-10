"use client";

import { AppShell } from "@/components/AppShell";
import { PollsPage } from "@/features/poll/PollsPage";

export default function PollsRoute() {
  return (
    <AppShell>
      <PollsPage />
    </AppShell>
  );
}
