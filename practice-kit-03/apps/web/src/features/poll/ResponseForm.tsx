"use client";

import { useState, type FormEvent } from "react";
import { RespondRequest, type PollDetail } from "@kit/contracts";
import { apiFetch } from "@/lib/api";
import { candidateLabel } from "./time";

type Props = { poll: PollDetail; onResponded: () => void };

// 처음 렌더링할 때 내 응답(myChoices)으로 체크 상태를 채운다. 다시 제출하면 이전 응답을 대체한다.
export function ResponseForm({ poll, onResponded }: Props) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set(poll.myChoices));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function toggle(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const payload = { candidateIds: [...selected] };
    // UX 보조: 서버와 같은 스키마로 먼저 검사한다. 최종 검증은 서버가 한다.
    const parsed = RespondRequest.safeParse(payload);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "입력값을 확인하세요");
      return;
    }
    setSubmitting(true);
    try {
      await apiFetch<PollDetail>(`/api/polls/${poll.id}/response`, {
        method: "PUT",
        body: JSON.stringify(parsed.data),
      });
      onResponded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "응답하지 못했습니다");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form aria-label="응답" onSubmit={handleSubmit} noValidate className="flex flex-col gap-3 rounded-lg border bg-white p-6">
      <h3 className="text-lg font-semibold">가능한 시간 고르기</h3>
      <div className="flex flex-wrap gap-3">
        {poll.candidates.map((c) => {
          const label = candidateLabel(c.startsAt);
          return (
            <label key={c.id} className="flex items-center gap-2 rounded border px-3 py-2">
              <input
                type="checkbox"
                aria-label={label}
                checked={selected.has(c.id)}
                onChange={(e) => toggle(c.id, e.target.checked)}
              />
              <span>{label}</span>
            </label>
          );
        })}
      </div>
      {error && (
        <p role="alert" className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={submitting}
        className="self-start rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
      >
        응답하기
      </button>
    </form>
  );
}
