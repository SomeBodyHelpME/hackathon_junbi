CREATE TABLE "candidates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"poll_id" uuid NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	CONSTRAINT "candidates_poll_starts_unique" UNIQUE("poll_id","starts_at"),
	CONSTRAINT "candidates_poll_id_unique" UNIQUE("poll_id","id")
);
--> statement-breakpoint
CREATE TABLE "polls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"created_by" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"confirmed_candidate_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "response_choices" (
	"poll_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"candidate_id" uuid NOT NULL,
	CONSTRAINT "response_choices_poll_id_user_id_candidate_id_pk" PRIMARY KEY("poll_id","user_id","candidate_id")
);
--> statement-breakpoint
CREATE TABLE "responses" (
	"poll_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "responses_poll_id_user_id_pk" PRIMARY KEY("poll_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_poll_id_polls_id_fk" FOREIGN KEY ("poll_id") REFERENCES "public"."polls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "polls" ADD CONSTRAINT "polls_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "response_choices" ADD CONSTRAINT "response_choices_poll_id_user_id_responses_poll_id_user_id_fk" FOREIGN KEY ("poll_id","user_id") REFERENCES "public"."responses"("poll_id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "response_choices" ADD CONSTRAINT "response_choices_poll_id_candidate_id_candidates_poll_id_id_fk" FOREIGN KEY ("poll_id","candidate_id") REFERENCES "public"."candidates"("poll_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "responses" ADD CONSTRAINT "responses_poll_id_polls_id_fk" FOREIGN KEY ("poll_id") REFERENCES "public"."polls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "responses" ADD CONSTRAINT "responses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;