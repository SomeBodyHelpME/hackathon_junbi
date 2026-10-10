"use client";

import { useEffect, useState } from "react";
import type { UserListResponse } from "@kit/contracts";
import { apiFetch } from "@/lib/api";

export function TeamList() {
  const [users, setUsers] = useState<UserListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<UserListResponse>("/api/users")
      .then(setUsers)
      .catch((e: Error) => setError(e.message));
  }, []);

  if (error) return <p role="alert">{error}</p>;
  if (!users) return <p>팀원을 불러오는 중…</p>;

  return (
    <section className="rounded-lg border bg-white p-6">
      <h2 className="mb-4 text-lg font-semibold">팀원</h2>
      <ul aria-label="팀원 목록" className="flex gap-2">
        {users.map((u) => (
          <li key={u.id} className="rounded border px-3 py-2">
            {u.name}
          </li>
        ))}
      </ul>
    </section>
  );
}
