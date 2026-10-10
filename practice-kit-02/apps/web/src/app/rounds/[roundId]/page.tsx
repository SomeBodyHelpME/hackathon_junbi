"use client";

import { useParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { RoundDetailPage } from "@/features/order/RoundDetailPage";

export default function RoundDetailRoute() {
  const { roundId } = useParams<{ roundId: string }>();
  return (
    <AppShell>
      <RoundDetailPage roundId={roundId} />
    </AppShell>
  );
}
