"use client";

import type { User } from "@kit/contracts";

export function Header({ user, onLogout }: { user: User | null; onLogout: () => void }) {
  return (
    <header className="flex items-center justify-between border-b bg-white px-6 py-3">
      <h1 className="text-xl font-bold">회의실 예약</h1>
      {user && (
        <div className="flex items-center gap-3">
          <span data-testid="current-user">{user.name}</span>
          <button type="button" onClick={onLogout} className="text-sm text-gray-500 underline">
            로그아웃
          </button>
        </div>
      )}
    </header>
  );
}
