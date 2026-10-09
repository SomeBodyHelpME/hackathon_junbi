import { ErrorResponse } from "@kit/contracts";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

// 공통 에러 형식 { error: { code, message } }를 담는 예외.
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

// 모든 API 호출의 단일 진입점. 세션 쿠키를 함께 보내고 오류를 ApiError로 바꾼다.
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      ...(init.body ? { "content-type": "application/json" } : {}),
      ...init.headers,
    },
  });

  if (!res.ok) {
    const parsed = ErrorResponse.safeParse(await res.json().catch(() => null));
    if (parsed.success) {
      throw new ApiError(res.status, parsed.data.error.code, parsed.data.error.message);
    }
    throw new ApiError(res.status, "UNKNOWN", "요청을 처리하지 못했습니다");
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
