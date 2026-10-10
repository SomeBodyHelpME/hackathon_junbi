-- REQ-03: 확정 후보는 반드시 같은 투표의 후보여야 한다 (다른 투표의 후보 id 참조 차단).
-- 앱 검증(400 INVALID_CANDIDATE)이 1차, 이 복합 FK가 최종 방어선이다. NULL(미확정)은 허용된다.
ALTER TABLE "polls" ADD CONSTRAINT "polls_confirmed_candidate_same_poll_fk"
  FOREIGN KEY ("id", "confirmed_candidate_id") REFERENCES "candidates"("poll_id", "id");--> statement-breakpoint
-- 상태와 확정 후보는 함께 움직인다: 확정이면 후보가 있고, 투표 중이면 없다.
ALTER TABLE "polls" ADD CONSTRAINT "polls_confirmed_state_check"
  CHECK (("status" = 'confirmed') = ("confirmed_candidate_id" IS NOT NULL));
