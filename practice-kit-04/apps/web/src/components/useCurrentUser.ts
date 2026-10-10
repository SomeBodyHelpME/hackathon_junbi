"use client";

import { useEffect, useState } from "react";
import type { User } from "@kit/contracts";
import { apiFetch, ApiError } from "@/lib/api";

// undefined: 확인 중, null: 비로그인
export function useCurrentUser() {
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

  return { user, setUser, logout };
}
