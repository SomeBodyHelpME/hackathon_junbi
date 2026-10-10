"use client";

import { useEffect, useState } from "react";
import type { MenuListResponse, RoundDetail } from "@kit/contracts";
import { apiFetch } from "@/lib/api";
import { formatWon } from "@/lib/format";
import { OrderForm } from "./OrderForm";
import { STATUS_LABEL } from "./status";

type Loaded = { token: number; round: RoundDetail; menus: MenuListResponse };

export function RoundDetailPage({ roundId }: { roundId: string }) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      apiFetch<RoundDetail>(`/api/rounds/${roundId}`),
      apiFetch<MenuListResponse>("/api/menus"),
    ])
      .then(([round, menus]) => setLoaded({ token: reloadToken, round, menus }))
      .catch((e: Error) => setError(e.message));
  }, [roundId, reloadToken]);

  const reload = () => setReloadToken((n) => n + 1);

  if (error && !loaded) return <p role="alert">{error}</p>;
  if (!loaded) return <p>불러오는 중…</p>;

  const { round, menus } = loaded;
  const isOpen = round.status === "open";

  return (
    <>
      <section className="rounded-lg border bg-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">{round.title}</h2>
            <p className="text-sm text-gray-500">
              {round.date} · 개설 {round.createdByName}
            </p>
          </div>
          <span data-testid="round-status" className="rounded bg-gray-100 px-3 py-1 text-sm">
            {STATUS_LABEL[round.status]}
          </span>
        </div>
      </section>

      {isOpen && <OrderForm roundId={round.id} menus={menus} onOrdered={reload} />}

      <section className="rounded-lg border bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold">주문 현황</h3>
        <ul aria-label="주문 현황" className="flex flex-col gap-2">
          {round.orders.map((o) => (
            <li key={o.id} className="flex items-center justify-between rounded border p-3">
              <div>
                <p>
                  <span className="font-medium">{o.userName}</span> · {o.menuName} {o.quantity}개
                </p>
                <p className="text-sm text-gray-500">
                  {formatWon(o.amount)}
                  {o.memo ? ` · ${o.memo}` : ""}
                </p>
              </div>
            </li>
          ))}
        </ul>
        {round.orders.length === 0 && <p className="text-sm text-gray-500">아직 주문이 없습니다.</p>}
      </section>
    </>
  );
}
