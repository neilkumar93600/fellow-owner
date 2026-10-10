CREATE TABLE "job_runs" (
	"job" text NOT NULL,
	"slot" timestamp (3) with time zone NOT NULL,
	"started_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp (3) with time zone,
	"status" text DEFAULT 'running' NOT NULL,
	"error" text,
	CONSTRAINT "job_runs_pk" PRIMARY KEY("job","slot"),
	CONSTRAINT "job_runs_status_check" CHECK ("job_runs"."status" in ('running', 'ok', 'failed', 'skipped'))
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"space_id" uuid NOT NULL,
	"reporter_user_id" text,
	"target_type" text NOT NULL,
	"target_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"note" text,
	"status" text DEFAULT 'open' NOT NULL,
	"resolved_by_user_id" text,
	"resolved_at" timestamp (3) with time zone,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reports_reporter_target_key" UNIQUE("reporter_user_id","target_type","target_id"),
	CONSTRAINT "reports_target_type_check" CHECK ("reports"."target_type" in ('post', 'comment')),
	CONSTRAINT "reports_reason_check" CHECK ("reports"."reason" in ('spam', 'harassment', 'off_topic', 'unsafe', 'other')),
	CONSTRAINT "reports_status_check" CHECK ("reports"."status" in ('open', 'resolved', 'dismissed')),
	CONSTRAINT "reports_note_check" CHECK ("reports"."note" is null or char_length("reports"."note") <= 500)
);
--> statement-breakpoint
CREATE TABLE "notification_prefs" (
	"user_id" text PRIMARY KEY NOT NULL,
	"email_enabled" boolean DEFAULT true NOT NULL,
	"kinds" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"unsubscribed_at" timestamp (3) with time zone,
	"last_digest_at" timestamp (3) with time zone,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "page_visits" (
	"space_id" uuid NOT NULL,
	"visitor_hash" text NOT NULL,
	"day" date NOT NULL,
	"visits" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "page_visits_pk" PRIMARY KEY("space_id","visitor_hash","day"),
	CONSTRAINT "page_visits_visits_check" CHECK ("page_visits"."visits" >= 1)
);
--> statement-breakpoint
CREATE TABLE "question_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"space_id" uuid NOT NULL,
	"question" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"draft" text,
	"answer" text,
	"embedding" vector(1536),
	"asked_count" integer DEFAULT 0 NOT NULL,
	"first_asked_at" timestamp (3) with time zone NOT NULL,
	"last_asked_at" timestamp (3) with time zone NOT NULL,
	"answered_at" timestamp (3) with time zone,
	"post_id" uuid,
	"pinned_community_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
	"redrafts_date" date,
	"redrafts_used" smallint DEFAULT 0 NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "question_groups_status_check" CHECK ("question_groups"."status" in ('open', 'answered', 'dismissed')),
	CONSTRAINT "question_groups_counts_check" CHECK ("question_groups"."asked_count" >= 0 and "question_groups"."redrafts_used" >= 0)
);
--> statement-breakpoint
CREATE TABLE "studio_snoozes" (
	"space_id" uuid NOT NULL,
	"ref_type" text NOT NULL,
	"ref_id" uuid NOT NULL,
	"until" timestamp (3) with time zone NOT NULL,
	CONSTRAINT "studio_snoozes_pk" PRIMARY KEY("space_id","ref_type","ref_id"),
	CONSTRAINT "studio_snoozes_ref_type_check" CHECK ("studio_snoozes"."ref_type" in ('pitch', 'post'))
);
--> statement-breakpoint
CREATE TABLE "support_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"name" text,
	"email" text NOT NULL,
	"message" text NOT NULL,
	"user_id" text,
	"status" text DEFAULT 'new' NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "support_requests_kind_check" CHECK ("support_requests"."kind" in ('contact', 'privacy_export', 'privacy_delete', 'privacy_other')),
	CONSTRAINT "support_requests_message_check" CHECK (char_length("support_requests"."message") between 10 and 4000)
);
--> statement-breakpoint
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_kind_check";--> statement-breakpoint
ALTER TABLE "communities" ADD COLUMN "cover_url" text;--> statement-breakpoint
ALTER TABLE "followers" ADD COLUMN "ai_tagged_at" timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "inbound" ADD COLUMN "read_at" timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "inbound" ADD COLUMN "shortlisted_at" timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "inbound" ADD COLUMN "question_group_id" uuid;--> statement-breakpoint
ALTER TABLE "inbound" ADD COLUMN "question_group_excluded" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "newsletter_subscribers" ADD COLUMN "confirmed_at" timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "question_group_id" uuid;--> statement-breakpoint
ALTER TABLE "spaces" ADD COLUMN "cover_url" text;--> statement-breakpoint
ALTER TABLE "spaces" ADD COLUMN "show_read_receipts" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "spaces" ADD COLUMN "bio_link_shared_at" timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_user_id_user_id_fk" FOREIGN KEY ("reporter_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_resolved_by_user_id_user_id_fk" FOREIGN KEY ("resolved_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_prefs" ADD CONSTRAINT "notification_prefs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page_visits" ADD CONSTRAINT "page_visits_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_groups" ADD CONSTRAINT "question_groups_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_groups" ADD CONSTRAINT "question_groups_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio_snoozes" ADD CONSTRAINT "studio_snoozes_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_requests" ADD CONSTRAINT "support_requests_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "reports_space_status_created_idx" ON "reports" USING btree ("space_id","status","created_at" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "question_groups_space_status_asked_idx" ON "question_groups" USING btree ("space_id","status","last_asked_at" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "support_requests_created_idx" ON "support_requests" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "inbound" ADD CONSTRAINT "inbound_question_group_id_question_groups_id_fk" FOREIGN KEY ("question_group_id") REFERENCES "public"."question_groups"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_question_group_id_question_groups_id_fk" FOREIGN KEY ("question_group_id") REFERENCES "public"."question_groups"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_feedback_created_by_idx" ON "ai_feedback" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE INDEX "digests_community_idx" ON "digests" USING btree ("community_id");--> statement-breakpoint
CREATE INDEX "followers_import_idx" ON "followers" USING btree ("import_id");--> statement-breakpoint
CREATE INDEX "inbound_embedding_hnsw_idx" ON "inbound" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "inbound_question_group_idx" ON "inbound" USING btree ("question_group_id");--> statement-breakpoint
CREATE INDEX "asks_community_idx" ON "asks" USING btree ("community_id");--> statement-breakpoint
CREATE INDEX "notifications_user_created_idx" ON "notifications" USING btree ("user_id","created_at" DESC NULLS FIRST,"id" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "notifications_read_created_idx" ON "notifications" USING btree ("created_at") WHERE "notifications"."read_at" is not null;--> statement-breakpoint
CREATE INDEX "notifications_space_idx" ON "notifications" USING btree ("space_id");--> statement-breakpoint
CREATE INDEX "posts_question_group_idx" ON "posts" USING btree ("question_group_id");--> statement-breakpoint
CREATE INDEX "posts_missing_embedding_idx" ON "posts" USING btree ("created_at") WHERE "posts"."embedding" is null and "posts"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "promotions_created_by_idx" ON "promotions" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE INDEX "comments_space_idx" ON "comments" USING btree ("space_id");--> statement-breakpoint
CREATE INDEX "signals_created_idx" ON "signals" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_kind_check" CHECK ("notifications"."kind" in ('reply_received', 'project_featured', 'team_request', 'team_decision', 'ask_posted', 'idea_posted', 'pitch_received', 'comment_received', 'post_loved', 'spotlighted', 'challenge_shortlisted', 'report_filed'));