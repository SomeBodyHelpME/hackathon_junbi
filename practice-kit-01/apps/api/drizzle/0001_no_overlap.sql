-- REQ-02: 같은 회의실의 시간 겹침을 DB 수준에서 금지한다.
-- 동시 요청이 들어와도 DB가 하나만 성공시킨다 (23P01 exclusion_violation).
-- tstzrange '[)' = 시작 포함, 끝 미포함 → 경계가 맞닿는 예약은 허용 (AC-06).
CREATE EXTENSION IF NOT EXISTS btree_gist;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_end_after_start" CHECK ("end_at" > "start_at");--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_no_overlap"
  EXCLUDE USING gist ("room_id" WITH =, tstzrange("start_at", "end_at", '[)') WITH &&);
