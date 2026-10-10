"use client";

import type { RoundSummary } from "@kit/contracts";
import { formatWon } from "@/lib/format";

// 금액은 서버가 계산한 값을 그대로 표시한다.
export function SummaryTable({ summary }: { summary: RoundSummary }) {
  return (
    <section className="rounded-lg border bg-white p-6">
      <h3 className="mb-4 text-lg font-semibold">취합</h3>
      <table aria-label="취합표" className="w-full text-left">
        <thead className="border-b text-sm text-gray-500">
          <tr>
            <th className="py-2">메뉴</th>
            <th className="py-2">수량</th>
            <th className="py-2">금액</th>
          </tr>
        </thead>
        <tbody>
          {summary.items.map((i) => (
            <tr key={i.menuId} className="border-b">
              <td className="py-2">{i.menuName}</td>
              <td className="py-2">{i.quantity}</td>
              <td className="py-2">{formatWon(i.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-4 text-right font-semibold">
        총액 <span data-testid="summary-total">{formatWon(summary.total)}</span>
      </p>
    </section>
  );
}
