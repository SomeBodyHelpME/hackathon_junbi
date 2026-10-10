"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { User } from "@kit/contracts";
import { Header } from "./Header";
import { LoginPanel } from "./LoginPanel";
import { useCurrentUser } from "./useCurrentUser";

const CurrentUserContext = createContext<User | null>(null);

// AppShell 안에서만 쓴다. 로그인된 사용자를 돌려준다.
export function useUser(): User {
  const user = useContext(CurrentUserContext);
  if (!user) throw new Error("useUser는 AppShell 안에서만 사용할 수 있습니다");
  return user;
}

// 로그인 확인 → 비로그인이면 로그인 패널, 로그인이면 children.
export function AppShell({ children }: { children: ReactNode }) {
  const { user, setUser, logout } = useCurrentUser();

  return (
    <>
      <Header user={user ?? null} onLogout={logout} />
      <main className="mx-auto flex max-w-4xl flex-col gap-6 p-6">
        {user === undefined && <p>불러오는 중…</p>}
        {user === null && <LoginPanel onLogin={setUser} />}
        {user && <CurrentUserContext.Provider value={user}>{children}</CurrentUserContext.Provider>}
      </main>
    </>
  );
}
