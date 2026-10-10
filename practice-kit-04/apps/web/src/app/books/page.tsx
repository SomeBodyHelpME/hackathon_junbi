"use client";

import { AppShell } from "@/components/AppShell";
import { BooksPage } from "@/features/loan/BooksPage";

export default function BooksRoute() {
  return (
    <AppShell>
      <BooksPage />
    </AppShell>
  );
}
