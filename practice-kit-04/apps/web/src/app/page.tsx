"use client";

import { useEffect, useState } from "react";
import type { BookListResponse } from "@kit/contracts";
import { AppShell } from "@/components/AppShell";
import { BookList } from "@/features/books/BookList";
import { apiFetch } from "@/lib/api";

function Catalog() {
  const [books, setBooks] = useState<BookListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<BookListResponse>("/api/books")
      .then(setBooks)
      .catch((e: Error) => setError(e.message));
  }, []);

  if (error) return <p role="alert">{error}</p>;
  if (!books) return <p>도서를 불러오는 중…</p>;
  return <BookList books={books} />;
}

export default function HomePage() {
  return (
    <AppShell>
      <Catalog />
    </AppShell>
  );
}
