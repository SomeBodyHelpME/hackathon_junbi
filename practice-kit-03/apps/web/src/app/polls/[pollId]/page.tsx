"use client";

import { useParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { PollDetailPage } from "@/features/poll/PollDetailPage";

export default function PollDetailRoute() {
  const { pollId } = useParams<{ pollId: string }>();
  return (
    <AppShell>
      <PollDetailPage pollId={pollId} />
    </AppShell>
  );
}
