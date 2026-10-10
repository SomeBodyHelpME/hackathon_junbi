// 금액 표시: 천 단위 콤마 + "원" (예: 27,000원)
export function formatWon(amount: number): string {
  return `${amount.toLocaleString("ko-KR")}원`;
}
