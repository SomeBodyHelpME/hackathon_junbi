"use client";

import { useEffect, useState } from "react";
import type { User } from "@kit/contracts";
import { apiFetch, ApiError } from "@/lib/api";
import { Header } from "@/components/Header";
import { LoginPanel } from "@/components/LoginPanel";
import { RoomList } from "@/features/rooms/RoomList";

export default function HomePage() {
  // undefined: 확인 중, null: 비로그인
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    apiFetch<User>("/api/auth/me")
      .then(setUser)
      .catch((e) => {
        if (e instanceof ApiError && e.status === 401) setUser(null);
        else throw e;
      });
  }, []);

  async function logout() {
    await apiFetch<void>("/api/auth/logout", { method: "POST" });
    setUser(null);
  }

  return (
    <>
      <Header user={user ?? null} onLogout={logout} />
      <main className="mx-auto flex max-w-4xl flex-col gap-6 p-6">
        {user === undefined && <p>불러오는 중…</p>}
        {user === null && <LoginPanel onLogin={setUser} />}
        {user && <RoomList />}
      </main>
    </>
  );
}
