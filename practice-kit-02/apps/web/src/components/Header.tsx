"use client";

import Link from "next/link";
import type { User } from "@kit/contracts";

export function Header({ user, onLogout }: { user: User | null; onLogout: () => void }) {
  return (
    <header className="flex items-center justify-between border-b bg-white px-6 py-3">
      <div className="flex items-center gap-6">
        <h1 className="text-xl font-bold">점심 주문</h1>
        <nav className="flex gap-4 text-sm">
          <Link href="/" className="hover:underline">
            메뉴
          </Link>
          <Link href="/rounds" className="hover:underline">
            점심 모집
          </Link>
        </nav>
      </div>
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
