"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";

// 버튼 노출 여부는 UX일 뿐이다. 실제 권한 검사는 API(DELETE /api/reservations/:id)가 한다.
export function CancelButton({
  reservationId,
  onCancelled,
  onError,
}: {
  reservationId: string;
  onCancelled: () => void;
  onError: (message: string) => void;
}) {
  const [busy, setBusy] = useState(false);

  async function cancel() {
    setBusy(true);
    try {
      await apiFetch<void>(`/api/reservations/${reservationId}`, { method: "DELETE" });
      onCancelled();
    } catch (e) {
      onError(e instanceof Error ? e.message : "취소하지 못했습니다");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={cancel}
      disabled={busy}
      className="rounded border border-red-300 px-3 py-1 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
    >
      취소
    </button>
  );
}
