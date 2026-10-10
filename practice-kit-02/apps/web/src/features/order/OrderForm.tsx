"use client";

import { useState, type FormEvent } from "react";
import { CreateOrderRequest, type Menu, type Order } from "@kit/contracts";
import { apiFetch } from "@/lib/api";
import { formatWon } from "@/lib/format";

type Props = { roundId: string; menus: Menu[]; onOrdered: () => void };

export function OrderForm({ roundId, menus, onOrdered }: Props) {
  const [menuId, setMenuId] = useState(menus[0]?.id ?? "");
  const [quantity, setQuantity] = useState("1");
  const [memo, setMemo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const payload = { menuId, quantity: quantity === "" ? Number.NaN : Number(quantity), memo };
    // UX 보조: 서버와 같은 스키마로 먼저 검사한다. 최종 검증은 서버가 한다.
    const parsed = CreateOrderRequest.safeParse(payload);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "입력값을 확인하세요");
      return;
    }
    setSubmitting(true);
    try {
      await apiFetch<Order>(`/api/rounds/${roundId}/orders`, { method: "POST", body: JSON.stringify(payload) });
      setMemo("");
      onOrdered();
    } catch (err) {
      setError(err instanceof Error ? err.message : "주문하지 못했습니다");
    } finally {
      setSubmitting(false);
    }
  }

  const fieldClass = "w-full rounded border px-3 py-2";

  // required/min/max 속성을 쓰지 않는다: 브라우저 기본 말풍선 대신 role="alert" 메시지를 보여 준다.
  return (
    <form
      aria-label="주문"
      onSubmit={handleSubmit}
      noValidate
      className="grid gap-4 rounded-lg border bg-white p-6 sm:grid-cols-3"
    >
      <h3 className="text-lg font-semibold sm:col-span-3">주문하기</h3>
      <label className="flex flex-col gap-1">
        <span className="text-sm text-gray-600">메뉴</span>
        <select value={menuId} onChange={(e) => setMenuId(e.target.value)} className={fieldClass}>
          {menus.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm text-gray-600">수량</span>
        <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} className={fieldClass} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm text-gray-600">요청사항</span>
        <input type="text" value={memo} onChange={(e) => setMemo(e.target.value)} className={fieldClass} />
      </label>
      <p className="text-sm text-gray-500 sm:col-span-3">
        {menus.map((m) => `${m.name} ${formatWon(m.price)}`).join(" · ")}
      </p>
      {error && (
        <p role="alert" className="rounded bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-3">
          {error}
        </p>
      )}
      <div className="sm:col-span-3">
        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          주문하기
        </button>
      </div>
    </form>
  );
}
