"use client";

import { AppShell } from "@/components/AppShell";
import { ReservationPage } from "@/features/reservation/ReservationPage";

export default function ReservationsRoute() {
  return (
    <AppShell>
      <ReservationPage />
    </AppShell>
  );
}
