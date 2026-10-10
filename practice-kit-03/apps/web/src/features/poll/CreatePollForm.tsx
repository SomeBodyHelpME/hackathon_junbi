"use client";

import { useState, type FormEvent } from "react";
import { CreatePollRequest, type PollCreated } from "@kit/contracts";
import { apiFetch } from "@/lib/api";
import { todayInSeoul } from "@/lib/date";
import { TIME_SLOTS, toSeoulIso } from "./time";

type Row = { date: string; time: string };
const MAX_CANDIDATES = 5;

export function CreatePollForm({ onCreated }: { onCreated: () => void }) {
  const [title, setTitle] = useState("");
  const [rows, setRows] = useState<Row[]>([{ date: todayInSeoul(), time: "10:00" }]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const update = (i: number, patch: Partial<Row>) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const payload = { title, candidates: rows.map((r) => ({ startsAt: toSeoulIso(r.date, r.time) })) };
    // UX 보조: 서버와 같은 스키마로 먼저 검사한다. 최종 검증은 서버가 한다.
    const parsed = CreatePollRequest.safeParse(payload);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "입력값을 확인하세요");
      return;
    }
    setSubmitting(true);
    try {
      await apiFetch<PollCreated>("/api/polls", { method: "POST", body: JSON.stringify(parsed.data) });
      setTitle("");
      setRows([{ date: todayInSeoul(), time: "10:00" }]);
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "투표를 만들지 못했습니다");
    } finally {
      setSubmitting(false);
    }
  }

  const fieldClass = "rounded border px-3 py-2";

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4 rounded-lg border bg-white p-6">
      <h2 className="text-lg font-semibold">투표 만들기</h2>
      <label className="flex flex-col gap-1">
        <span className="text-sm text-gray-600">제목</span>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className={fieldClass} />
      </label>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm text-gray-600">후보 시간</legend>
        {rows.map((row, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              aria-label={`후보 ${i + 1} 날짜`}
              value={row.date}
              onChange={(e) => update(i, { date: e.target.value })}
              className={fieldClass}
            />
            <select
              aria-label={`후보 ${i + 1} 시각`}
              value={row.time}
              onChange={(e) => update(i, { time: e.target.value })}
              className={fieldClass}
            >
              {TIME_SLOTS.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
            {rows.length > 1 && (
              <button
                type="button"
                onClick={() => setRows((prev) => prev.filter((_, idx) => idx !== i))}
                className="text-sm text-gray-500 underline"
              >
                후보 {i + 1} 삭제
              </button>
            )}
          </div>
        ))}
        {rows.length < MAX_CANDIDATES && (
          <button
            type="button"
            onClick={() => setRows((prev) => [...prev, { ...prev[prev.length - 1] }])}
            className="self-start rounded border px-3 py-1 text-sm"
          >
            후보 추가
          </button>
        )}
      </fieldset>

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
        투표 만들기
      </button>
    </form>
  );
}
