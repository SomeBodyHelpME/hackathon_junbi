"use client";

import type { User } from "@kit/contracts";
import { apiFetch } from "@/lib/api";

// 가짜 로그인: 시드 사용자 중 한 명을 고른다.
const USERS = [
  { id: "u-sangeun", name: "상은" },
  { id: "u-gwaneung", name: "관응" },
];

export function LoginPanel({ onLogin }: { onLogin: (user: User) => void }) {
  async function login(userId: string) {
    const user = await apiFetch<User>("/api/auth/fake-login", {
      method: "POST",
      body: JSON.stringify({ userId }),
    });
    onLogin(user);
  }

  return (
    <section aria-label="로그인" className="rounded-lg border bg-white p-6">
      <h2 className="mb-4 text-lg font-semibold">사용자를 선택하세요</h2>
      <div className="flex gap-2">
        {USERS.map((u) => (
          <button
            key={u.id}
            type="button"
            onClick={() => login(u.id)}
            className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            {u.name}으로 로그인
          </button>
        ))}
      </div>
    </section>
  );
}
