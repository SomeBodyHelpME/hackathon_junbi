"use client";

import type { ReactNode } from "react";
import type { Loan } from "@kit/contracts";

// 내 대여 목록. 로딩이 끝난 뒤에만 렌더링된다 (부모가 보장). 빈 목록도 <ul>은 항상 그린다.
export function MyLoans({ loans, actions }: { loans: Loan[]; actions?: (loan: Loan) => ReactNode }) {
  return (
    <section className="rounded-lg border bg-white p-6">
      <h2 className="mb-4 text-lg font-semibold">내 대여</h2>
      <ul aria-label="내 대여" className="flex flex-col gap-2">
        {loans.map((l) => (
          <li key={l.id} className="flex items-center justify-between rounded border p-3">
            <div>
              <p className="font-medium">{l.bookTitle}</p>
              <p className="text-sm text-gray-500">
                반납 기한 <span data-testid="due-on">{l.dueOn}</span>
                {l.extended && " (연장됨)"}
              </p>
            </div>
            <div className="flex gap-2">{actions?.(l)}</div>
          </li>
        ))}
      </ul>
      {loans.length === 0 && <p className="text-sm text-gray-500">대여 중인 도서가 없습니다.</p>}
    </section>
  );
}
