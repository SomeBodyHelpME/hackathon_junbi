import type { RoundStatus } from "@kit/contracts";

export const STATUS_LABEL: Record<RoundStatus, string> = {
  open: "모집 중",
  closed: "마감",
};
