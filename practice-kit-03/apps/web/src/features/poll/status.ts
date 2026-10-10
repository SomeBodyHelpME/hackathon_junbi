import type { PollStatus } from "@kit/contracts";

export const STATUS_LABEL: Record<PollStatus, string> = {
  open: "투표 중",
  confirmed: "확정",
};
