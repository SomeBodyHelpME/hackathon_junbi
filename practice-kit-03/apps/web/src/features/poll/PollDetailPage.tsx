"use client";

import { useEffect, useState } from "react";
import type { PollDetail } from "@kit/contracts";
import { apiFetch } from "@/lib/api";
import { ResponseForm } from "./ResponseForm";
import { STATUS_LABEL } from "./status";
import { candidateLabel } from "./time";

type Loaded = { token: number; poll: PollDetail };

export function PollDetailPage({ pollId }: { pollId: string }) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<PollDetail>(`/api/polls/${pollId}`)
      .then((poll) => setLoaded({ token: reloadToken, poll }))
      .catch((e: Error) => setError(e.message));
  }, [pollId, reloadToken]);

  const reload = () => setReloadToken((n) => n + 1);

  if (error && !loaded) return <p role="alert">{error}</p>;
  if (!loaded) return <p>불러오는 중…</p>;

  const { poll } = loaded;
  const isOpen = poll.status === "open";
  const top = poll.candidates.filter((c) => poll.topCandidateIds.includes(c.id));

  return (
    <>
      <section className="rounded-lg border bg-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">{poll.title}</h2>
            <p className="text-sm text-gray-500">개설 {poll.createdByName}</p>
          </div>
          <span data-testid="poll-status" className="rounded bg-gray-100 px-3 py-1 text-sm">
            {STATUS_LABEL[poll.status]}
          </span>
        </div>
      </section>

      {/* key: 다시 불러오면 최신 내 응답으로 체크 상태를 초기화한다 */}
      {isOpen && <ResponseForm key={loaded.token} poll={poll} onResponded={reload} />}

      <section className="rounded-lg border bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold">집계</h3>
        <table aria-label="집계" className="w-full text-left">
          <thead className="border-b text-sm text-gray-500">
            <tr>
              <th className="py-2">후보</th>
              <th className="py-2">가능 인원</th>
            </tr>
          </thead>
          <tbody>
            {poll.candidates.map((c) => (
              <tr key={c.id} className="border-b">
                <td className="py-2">{candidateLabel(c.startsAt)}</td>
                <td className="py-2">{c.count}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h4 className="mt-6 mb-2 font-semibold">최다 득표 후보</h4>
        <ul aria-label="최다 득표 후보" className="flex flex-wrap gap-2">
          {top.map((c) => (
            <li key={c.id} className="rounded bg-yellow-100 px-3 py-1">
              {candidateLabel(c.startsAt)}
            </li>
          ))}
        </ul>
        {top.length === 0 && <p className="text-sm text-gray-500">아직 응답이 없습니다.</p>}
      </section>
    </>
  );
}
