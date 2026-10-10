"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { CreateRoundRequest, type Round, type RoundListResponse } from "@kit/contracts";
import { apiFetch } from "@/lib/api";
import { todayInSeoul } from "@/lib/date";
import { STATUS_LABEL } from "./status";

const fetchRounds = () => apiFetch<RoundListResponse>("/api/rounds");

export function RoundsPage() {
  const [rounds, setRounds] = useState<RoundListResponse | null>(null);
  const [date, setDate] = useState(todayInSeoul());
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchRounds()
      .then(setRounds)
      .catch((e: Error) => setError(e.message));
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    // UX 보조: 서버와 같은 스키마로 먼저 검사한다. 최종 검증은 서버가 한다.
    const parsed = CreateRoundRequest.safeParse({ date, title });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "입력값을 확인하세요");
      return;
    }
    setSubmitting(true);
    try {
      await apiFetch<Round>("/api/rounds", { method: "POST", body: JSON.stringify(parsed.data) });
      setTitle("");
      setRounds(await fetchRounds());
    } catch (err) {
      setError(err instanceof Error ? err.message : "모집을 열지 못했습니다");
    } finally {
      setSubmitting(false);
    }
  }

  const fieldClass = "w-full rounded border px-3 py-2";

  return (
    <>
      <form onSubmit={handleSubmit} noValidate className="grid gap-4 rounded-lg border bg-white p-6 sm:grid-cols-2">
        <h2 className="text-lg font-semibold sm:col-span-2">점심 모집 열기</h2>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-gray-600">날짜</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={fieldClass} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-gray-600">제목</span>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className={fieldClass} />
        </label>
        {error && (
          <p role="alert" className="rounded bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-2">
            {error}
          </p>
        )}
        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={submitting}
            className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            모집 열기
          </button>
        </div>
      </form>

      <section className="rounded-lg border bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold">모집 목록</h2>
        {!rounds ? (
          <p>불러오는 중…</p>
        ) : (
          <>
            <ul aria-label="모집" className="flex flex-col gap-2">
              {rounds.map((r) => (
                <li key={r.id} className="flex items-center justify-between rounded border p-3">
                  <div>
                    <Link href={`/rounds/${r.id}`} className="font-medium text-blue-700 hover:underline">
                      {r.title}
                    </Link>
                    <p className="text-sm text-gray-500">
                      {r.date} · 개설 {r.createdByName}
                    </p>
                  </div>
                  <span className="text-sm">{STATUS_LABEL[r.status]}</span>
                </li>
              ))}
            </ul>
            {rounds.length === 0 && <p className="text-sm text-gray-500">열린 모집이 없습니다.</p>}
          </>
        )}
      </section>
    </>
  );
}
