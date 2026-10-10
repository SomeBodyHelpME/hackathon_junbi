"use client";

import { useEffect, useState } from "react";
import type { PollDetail } from "@kit/contracts";
import { useUser } from "@/components/AppShell";
import { apiFetch } from "@/lib/api";
import { ResponseForm } from "./ResponseForm";
import { STATUS_LABEL } from "./status";
import { candidateLabel } from "./time";

type Loaded = { token: number; poll: PollDetail };

export function PollDetailPage({ pollId }: { pollId: string }) {
  const user = useUser();
  const [confirming, setConfirming] = useState(false);
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
  const confirmed = poll.candidates.find((c) => c.id === poll.confirmedCandidateId);
  // 버튼 노출은 UX일 뿐이다. 개설자·후보 검사는 API(POST /api/polls/:id/confirm)가 한다.
  const canConfirm = isOpen && poll.createdBy === user.id;

  async function confirmCandidate(candidateId: string) {
    setConfirming(true);
    setError(null);
    try {
      await apiFetch<void>(`/api/polls/${pollId}/confirm`, {
        method: "POST",
        body: JSON.stringify({ candidateId }),
      });
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "확정하지 못했습니다");
    } finally {
      setConfirming(false);
    }
  }

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
        {confirmed && (
          <p className="mt-3 rounded bg-green-50 px-3 py-2">
            확정된 시간: <strong data-testid="confirmed-time">{candidateLabel(confirmed.startsAt)}</strong>
          </p>
        )}
        {error && (
          <p role="alert" className="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
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
              {canConfirm && <th className="py-2" />}
            </tr>
          </thead>
          <tbody>
            {poll.candidates.map((c) => (
              <tr key={c.id} className="border-b">
                <td className="py-2">{candidateLabel(c.startsAt)}</td>
                <td className="py-2">{c.count}</td>
                {canConfirm && (
                  <td className="py-2 text-right">
                    <button
                      type="button"
                      aria-label={`${candidateLabel(c.startsAt)}으로 확정`}
                      onClick={() => confirmCandidate(c.id)}
                      disabled={confirming}
                      className="rounded bg-gray-800 px-3 py-1 text-sm text-white hover:bg-gray-900 disabled:opacity-50"
                    >
                      확정
                    </button>
                  </td>
                )}
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
