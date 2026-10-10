"use client";

import type { ReactNode } from "react";
import type { Book } from "@kit/contracts";

// 도서 목록. 항목마다 제목·남은 권수, 오른쪽에 action(대여 버튼 등)을 붙일 수 있다.
export function BookList({ books, action }: { books: Book[]; action?: (book: Book) => ReactNode }) {
  return (
    <section className="rounded-lg border bg-white p-6">
      <h2 className="mb-4 text-lg font-semibold">도서</h2>
      <ul aria-label="도서 목록" className="flex flex-col gap-2">
        {books.map((b) => (
          <li key={b.id} className="flex items-center justify-between rounded border p-3">
            <div>
              <p className="font-medium">{b.title}</p>
              <p className="text-sm text-gray-500" data-testid="available">
                {b.availableCopies > 0 ? `남은 권수 ${b.availableCopies}권` : "대여 불가"}
              </p>
            </div>
            {action?.(b)}
          </li>
        ))}
      </ul>
    </section>
  );
}
