"use client";

import type { ReactNode } from "react";
import { Header } from "./Header";
import { LoginPanel } from "./LoginPanel";
import { useCurrentUser } from "./useCurrentUser";

// 로그인 확인 → 비로그인이면 로그인 패널, 로그인이면 children.
export function AppShell({ children }: { children: ReactNode }) {
  const { user, setUser, logout } = useCurrentUser();

  return (
    <>
      <Header user={user ?? null} onLogout={logout} />
      <main className="mx-auto flex max-w-4xl flex-col gap-6 p-6">
        {user === undefined && <p>불러오는 중…</p>}
        {user === null && <LoginPanel onLogin={setUser} />}
        {user && children}
      </main>
    </>
  );
}
