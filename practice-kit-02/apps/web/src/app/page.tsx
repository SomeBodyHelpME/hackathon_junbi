"use client";

import { AppShell } from "@/components/AppShell";
import { MenuList } from "@/features/menus/MenuList";

export default function HomePage() {
  return (
    <AppShell>
      <MenuList />
    </AppShell>
  );
}
