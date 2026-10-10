"use client";

import { useEffect, useState } from "react";
import type { MenuListResponse } from "@kit/contracts";
import { apiFetch } from "@/lib/api";
import { formatWon } from "@/lib/format";

export function MenuList() {
  const [menus, setMenus] = useState<MenuListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<MenuListResponse>("/api/menus")
      .then(setMenus)
      .catch((e: Error) => setError(e.message));
  }, []);

  if (error) return <p role="alert">{error}</p>;
  if (!menus) return <p>메뉴를 불러오는 중…</p>;

  return (
    <section className="rounded-lg border bg-white p-6">
      <h2 className="mb-4 text-lg font-semibold">오늘의 메뉴</h2>
      <ul aria-label="메뉴 목록" className="grid gap-2 sm:grid-cols-3">
        {menus.map((menu) => (
          <li key={menu.id} className="rounded border p-3">
            <span className="font-medium">{menu.name}</span>
            <span className="ml-2 text-sm text-gray-500">{formatWon(menu.price)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
