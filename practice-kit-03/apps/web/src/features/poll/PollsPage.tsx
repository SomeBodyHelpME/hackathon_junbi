"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { PollListResponse } from "@kit/contracts";
import { apiFetch } from "@/lib/api";
import { CreatePollForm } from "./CreatePollForm";
import { STATUS_LABEL } from "./status";

const fetchPolls = () => apiFetch<PollListResponse>("/api/polls");

export function PollsPage() {
  const [polls, setPolls] = useState<PollListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPolls()
      .then(setPolls)
      .catch((e: Error) => setError(e.message));
  }, []);

  const refresh = () =>
    fetchPolls()
      .then(setPolls)
      .catch((e: Error) => setError(e.message));

  return (
    <>
      <CreatePollForm onCreated={refresh} />
      <section className="rounded-lg border bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold">투표 목록</h2>
        {error && <p role="alert">{error}</p>}
        {!polls ? (
          <p>불러오는 중…</p>
        ) : (
          <>
            <ul aria-label="투표" className="flex flex-col gap-2">
              {polls.map((p) => (
                <li key={p.id} className="flex items-center justify-between rounded border p-3">
                  <div>
                    <Link href={`/polls/${p.id}`} className="font-medium text-blue-700 hover:underline">
                      {p.title}
                    </Link>
                    <p className="text-sm text-gray-500">개설 {p.createdByName}</p>
                  </div>
                  <span className="text-sm">{STATUS_LABEL[p.status]}</span>
                </li>
              ))}
            </ul>
            {polls.length === 0 && <p className="text-sm text-gray-500">투표가 없습니다.</p>}
          </>
        )}
      </section>
    </>
  );
}
