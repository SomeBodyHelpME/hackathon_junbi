"use client";

import { useEffect, useState } from "react";
import type { BookListResponse, Loan, LoanListResponse } from "@kit/contracts";
import { apiFetch } from "@/lib/api";
import { BookList } from "@/features/books/BookList";
import { MyLoans } from "./MyLoans";

type Loaded = { books: BookListResponse; loans: LoanListResponse };

const fetchAll = () =>
  Promise.all([
    apiFetch<BookListResponse>("/api/books"),
    apiFetch<LoanListResponse>("/api/loans?mine=true"),
  ]).then(([books, loans]): Loaded => ({ books, loans }));

export function BooksPage() {
  const [data, setData] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchAll()
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, []);

  // 대여·반납·연장 후 도서 목록과 내 대여를 함께 다시 불러온다.
  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : "처리하지 못했습니다");
    } finally {
      setData(await fetchAll().catch(() => data));
      setBusy(false);
    }
  }

  const borrow = (bookId: string) =>
    run(() => apiFetch<Loan>("/api/loans", { method: "POST", body: JSON.stringify({ bookId }) }));

  if (!data) return error ? <p role="alert">{error}</p> : <p>불러오는 중…</p>;

  return (
    <>
      {error && (
        <p role="alert" className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <BookList
        books={data.books}
        action={(b) =>
          b.availableCopies > 0 && (
            <button
              type="button"
              onClick={() => borrow(b.id)}
              disabled={busy}
              className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
            >
              대여
            </button>
          )
        }
      />
      <MyLoans loans={data.loans} />
    </>
  );
}
