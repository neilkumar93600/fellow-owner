CREATE TYPE "public"."analysis_status" AS ENUM('pending', 'done', 'failed');--> statement-breakpoint
CREATE TYPE "public"."membership_role" AS ENUM('owner', 'member');--> statement-breakpoint
CREATE TYPE "public"."pitch_status" AS ENUM('new', 'shortlisted', 'replied', 'archived', 'withdrawn');--> statement-breakpoint
CREATE TYPE "public"."pitch_type" AS ENUM('collab', 'investment', 'idea', 'press', 'fan_note', 'other');--> statement-breakpoint
CREATE TYPE "public"."post_status" AS ENUM('open', 'forming_team', 'building', 'launched');--> statement-breakpoint
CREATE TYPE "public"."post_type" AS ENUM('idea', 'project', 'discussion');--> statement-breakpoint
CREATE TYPE "public"."signal_kind" AS ENUM('use', 'build');--> statement-breakpoint
CREATE TYPE "public"."team_status" AS ENUM('requested', 'accepted', 'declined');--> statement-breakpoint
CREATE TYPE "public"."tint" AS ENUM('peach', 'lavender', 'aqua', 'lime', 'white');--> statement-breakpoint
CREATE TABLE "ai_feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"space_id" uuid NOT NULL,
	"ref_type" text NOT NULL,
	"ref_id" text NOT NULL,
	"verdict" text NOT NULL,
	"created_by_user_id" text NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_feedback_ref_user_key" UNIQUE("ref_type","ref_id","created_by_user_id"),
	CONSTRAINT "ai_feedback_ref_type_check" CHECK ("ai_feedback"."ref_type" in ('post', 'inbound', 'briefing_highlight')),
	CONSTRAINT "ai_feedback_verdict_check" CHECK ("ai_feedback"."verdict" in ('up', 'down'))
);
--> statement-breakpoint
CREATE TABLE "ai_runs" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"space_id" uuid NOT NULL,
	"user_id" text,
	"task" text NOT NULL,
	"ref_type" text,
	"ref_id" uuid,
	"model" text NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"latency_ms" integer DEFAULT 0 NOT NULL,
	"status" text NOT NULL,
	"error" text,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "digests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"space_id" uuid NOT NULL,
	"community_id" uuid,
	"period_date" date NOT NULL,
	"content" jsonb NOT NULL,
	"model" text NOT NULL,
	"regenerations" smallint DEFAULT 0 NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "digests_space_community_period_key" UNIQUE NULLS NOT DISTINCT("space_id","community_id","period_date"),
	CONSTRAINT "digests_regenerations_check" CHECK ("digests"."regenerations" >= 0)
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp (3) with time zone,
	"refresh_token_expires_at" timestamp (3) with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp (3) with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp (3) with time zone NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "communities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"space_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"tint" "tint" DEFAULT 'white' NOT NULL,
	"icon" text DEFAULT 'users' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"member_count" integer DEFAULT 0 NOT NULL,
	"archived_at" timestamp (3) with time zone,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "communities_slug_check" CHECK ("communities"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length("communities"."slug") between 2 and 40),
	CONSTRAINT "communities_name_check" CHECK (char_length("communities"."name") between 2 and 40),
	CONSTRAINT "communities_member_count_check" CHECK ("communities"."member_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "community_members" (
	"community_id" uuid NOT NULL,
	"membership_id" uuid NOT NULL,
	"joined_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "community_members_pk" PRIMARY KEY("community_id","membership_id")
);
--> statement-breakpoint
CREATE TABLE "inbound" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"space_id" uuid NOT NULL,
	"sender_membership_id" uuid NOT NULL,
	"type" "pitch_type" NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"links" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" "pitch_status" DEFAULT 'new' NOT NULL,
	"is_filtered" boolean DEFAULT false NOT NULL,
	"creator_reply" text,
	"replied_at" timestamp (3) with time zone,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"analysis_status" "analysis_status" DEFAULT 'pending' NOT NULL,
	"analysis_attempts" smallint DEFAULT 0 NOT NULL,
	"analysis_error" text,
	"analysis_claimed_at" timestamp (3) with time zone,
	"content_hash" text NOT NULL,
	"scored_taste_version" integer,
	"ai_summary" text,
	"ai_category" text,
	"ai_fit_score" smallint,
	"ai_fit_reason" text,
	"ai_tags" text[],
	"ai_skills" text[],
	"ai_is_spam" boolean,
	"embedding" vector(1536),
	CONSTRAINT "inbound_subject_check" CHECK (char_length("inbound"."subject") between 5 and 120),
	CONSTRAINT "inbound_body_check" CHECK (char_length("inbound"."body") between 20 and 3000),
	CONSTRAINT "inbound_creator_reply_check" CHECK ("inbound"."creator_reply" is null or char_length("inbound"."creator_reply") between 1 and 2000),
	CONSTRAINT "inbound_ai_fit_score_check" CHECK ("inbound"."ai_fit_score" is null or "inbound"."ai_fit_score" between 0 and 100),
	CONSTRAINT "inbound_analysis_attempts_check" CHECK ("inbound"."analysis_attempts" >= 0)
);
--> statement-breakpoint
CREATE TABLE "asks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"space_id" uuid NOT NULL,
	"community_id" uuid,
	"title" text NOT NULL,
	"body" text,
	"due_at" timestamp (3) with time zone,
	"status" text DEFAULT 'open' NOT NULL,
	"response_summary" jsonb,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "asks_title_check" CHECK (char_length("asks"."title") between 5 and 120),
	CONSTRAINT "asks_body_check" CHECK ("asks"."body" is null or char_length("asks"."body") <= 2000),
	CONSTRAINT "asks_status_check" CHECK ("asks"."status" in ('open', 'closed'))
);
--> statement-breakpoint
CREATE TABLE "imports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"space_id" uuid NOT NULL,
	"source" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"item_count" integer DEFAULT 0 NOT NULL,
	"result" jsonb,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "imports_source_check" CHECK ("imports"."source" in ('paste', 'csv', 'youtube')),
	CONSTRAINT "imports_status_check" CHECK ("imports"."status" in ('pending', 'done', 'failed'))
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"space_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"read_at" timestamp (3) with time zone,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notifications_kind_check" CHECK ("notifications"."kind" in ('reply_received', 'project_featured', 'team_request', 'team_decision', 'ask_posted'))
);
--> statement-breakpoint
CREATE TABLE "memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"space_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"role" "membership_role" DEFAULT 'member' NOT NULL,
	"headline" text,
	"intro" text,
	"skills" text[] DEFAULT '{}'::text[] NOT NULL,
	"links" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"embedding" vector(1536),
	"removed_at" timestamp (3) with time zone,
	"joined_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"space_id" uuid NOT NULL,
	"community_id" uuid NOT NULL,
	"author_membership_id" uuid,
	"ask_id" uuid,
	"type" "post_type" NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"status" "post_status" DEFAULT 'open' NOT NULL,
	"roles_needed" text[] DEFAULT '{}'::text[] NOT NULL,
	"links" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"use_count" integer DEFAULT 0 NOT NULL,
	"build_count" integer DEFAULT 0 NOT NULL,
	"comment_count" integer DEFAULT 0 NOT NULL,
	"featured_at" timestamp (3) with time zone,
	"hidden_at" timestamp (3) with time zone,
	"deleted_at" timestamp (3) with time zone,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"analysis_status" "analysis_status" DEFAULT 'pending' NOT NULL,
	"analysis_attempts" smallint DEFAULT 0 NOT NULL,
	"analysis_error" text,
	"analysis_claimed_at" timestamp (3) with time zone,
	"content_hash" text NOT NULL,
	"scored_taste_version" integer,
	"ai_summary" text,
	"ai_category" text,
	"ai_fit_score" smallint,
	"ai_fit_reason" text,
	"ai_tags" text[],
	"ai_skills" text[],
	"ai_is_spam" boolean,
	"embedding" vector(1536),
	CONSTRAINT "posts_title_check" CHECK (char_length("posts"."title") between 5 and 120),
	CONSTRAINT "posts_body_check" CHECK (char_length("posts"."body") between 20 and 5000),
	CONSTRAINT "posts_roles_needed_check" CHECK (cardinality("posts"."roles_needed") <= 5),
	CONSTRAINT "posts_counts_check" CHECK ("posts"."use_count" >= 0 and "posts"."build_count" >= 0 and "posts"."comment_count" >= 0),
	CONSTRAINT "posts_ai_fit_score_check" CHECK ("posts"."ai_fit_score" is null or "posts"."ai_fit_score" between 0 and 100),
	CONSTRAINT "posts_analysis_attempts_check" CHECK ("posts"."analysis_attempts" >= 0)
);
--> statement-breakpoint
CREATE TABLE "click_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"promotion_id" uuid NOT NULL,
	"platform" text DEFAULT 'other' NOT NULL,
	"referrer_host" text,
	"visitor_hash" text,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "click_events_platform_check" CHECK ("click_events"."platform" in ('x', 'instagram', 'linkedin', 'youtube', 'other'))
);
--> statement-breakpoint
CREATE TABLE "promotions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"space_id" uuid NOT NULL,
	"post_id" uuid NOT NULL,
	"headline" text,
	"drafts" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"draft_errors" text[] DEFAULT '{}'::text[] NOT NULL,
	"showcase_slug" text,
	"short_code" text,
	"click_count" integer DEFAULT 0 NOT NULL,
	"published_at" timestamp (3) with time zone,
	"unpublished_at" timestamp (3) with time zone,
	"created_by_user_id" text NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "promotions_click_count_check" CHECK ("promotions"."click_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"space_id" uuid NOT NULL,
	"author_membership_id" uuid,
	"body" text NOT NULL,
	"hidden_at" timestamp (3) with time zone,
	"deleted_at" timestamp (3) with time zone,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "comments_body_check" CHECK (char_length("comments"."body") between 1 and 2000)
);
--> statement-breakpoint
CREATE TABLE "signals" (
	"post_id" uuid NOT NULL,
	"membership_id" uuid NOT NULL,
	"kind" "signal_kind" NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "signals_pk" PRIMARY KEY("post_id","membership_id","kind")
);
--> statement-breakpoint
CREATE TABLE "team_members" (
	"post_id" uuid NOT NULL,
	"membership_id" uuid NOT NULL,
	"role" text NOT NULL,
	"status" "team_status" DEFAULT 'requested' NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"decided_at" timestamp (3) with time zone,
	CONSTRAINT "team_members_pk" PRIMARY KEY("post_id","membership_id"),
	CONSTRAINT "team_members_role_check" CHECK (char_length("team_members"."role") between 2 and 30)
);
--> statement-breakpoint
CREATE TABLE "spaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_user_id" text NOT NULL,
	"handle" text NOT NULL,
	"display_name" text NOT NULL,
	"bio" text,
	"avatar_url" text,
	"platforms" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"taste_profile" jsonb DEFAULT '{"promote":[],"never":[],"voice":[]}'::jsonb NOT NULL,
	"taste_version" integer DEFAULT 1 NOT NULL,
	"ai_daily_token_budget" integer DEFAULT 200000 NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "spaces_handle_check" CHECK ("spaces"."handle" ~ '^[a-z0-9_.]+$' and char_length("spaces"."handle") between 3 and 30),
	CONSTRAINT "spaces_display_name_check" CHECK (char_length("spaces"."display_name") between 1 and 60),
	CONSTRAINT "spaces_taste_version_check" CHECK ("spaces"."taste_version" >= 1),
	CONSTRAINT "spaces_ai_budget_check" CHECK ("spaces"."ai_daily_token_budget" >= 0)
);
--> statement-breakpoint
ALTER TABLE "ai_feedback" ADD CONSTRAINT "ai_feedback_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_feedback" ADD CONSTRAINT "ai_feedback_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_runs" ADD CONSTRAINT "ai_runs_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_runs" ADD CONSTRAINT "ai_runs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "digests" ADD CONSTRAINT "digests_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "digests" ADD CONSTRAINT "digests_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communities" ADD CONSTRAINT "communities_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_members" ADD CONSTRAINT "community_members_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_members" ADD CONSTRAINT "community_members_membership_id_memberships_id_fk" FOREIGN KEY ("membership_id") REFERENCES "public"."memberships"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inbound" ADD CONSTRAINT "inbound_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inbound" ADD CONSTRAINT "inbound_sender_membership_id_memberships_id_fk" FOREIGN KEY ("sender_membership_id") REFERENCES "public"."memberships"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asks" ADD CONSTRAINT "asks_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asks" ADD CONSTRAINT "asks_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imports" ADD CONSTRAINT "imports_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_author_membership_id_memberships_id_fk" FOREIGN KEY ("author_membership_id") REFERENCES "public"."memberships"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_ask_id_asks_id_fk" FOREIGN KEY ("ask_id") REFERENCES "public"."asks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "click_events" ADD CONSTRAINT "click_events_promotion_id_promotions_id_fk" FOREIGN KEY ("promotion_id") REFERENCES "public"."promotions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_author_membership_id_memberships_id_fk" FOREIGN KEY ("author_membership_id") REFERENCES "public"."memberships"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signals" ADD CONSTRAINT "signals_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signals" ADD CONSTRAINT "signals_membership_id_memberships_id_fk" FOREIGN KEY ("membership_id") REFERENCES "public"."memberships"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_membership_id_memberships_id_fk" FOREIGN KEY ("membership_id") REFERENCES "public"."memberships"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spaces" ADD CONSTRAINT "spaces_owner_user_id_user_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_feedback_space_idx" ON "ai_feedback" USING btree ("space_id","ref_type");--> statement-breakpoint
CREATE INDEX "ai_runs_space_created_idx" ON "ai_runs" USING btree ("space_id","created_at");--> statement-breakpoint
CREATE INDEX "ai_runs_user_task_created_idx" ON "ai_runs" USING btree ("user_id","task","created_at");--> statement-breakpoint
CREATE INDEX "ai_runs_created_idx" ON "ai_runs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "digests_period_idx" ON "digests" USING btree ("period_date");--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE UNIQUE INDEX "communities_space_slug_uidx" ON "communities" USING btree ("space_id","slug");--> statement-breakpoint
CREATE INDEX "communities_space_sort_idx" ON "communities" USING btree ("space_id","sort_order");--> statement-breakpoint
CREATE INDEX "community_members_membership_idx" ON "community_members" USING btree ("membership_id");--> statement-breakpoint
CREATE INDEX "inbound_space_status_fit_idx" ON "inbound" USING btree ("space_id","status","ai_fit_score" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "inbound_space_created_idx" ON "inbound" USING btree ("space_id","created_at" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "inbound_sender_created_idx" ON "inbound" USING btree ("sender_membership_id","created_at");--> statement-breakpoint
CREATE INDEX "inbound_space_analysis_idx" ON "inbound" USING btree ("space_id","analysis_status") WHERE "inbound"."analysis_status" <> 'done';--> statement-breakpoint
CREATE INDEX "asks_space_created_idx" ON "asks" USING btree ("space_id","created_at" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "imports_space_created_idx" ON "imports" USING btree ("space_id","created_at" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "notifications_user_read_created_idx" ON "notifications" USING btree ("user_id","read_at","created_at" DESC NULLS FIRST);--> statement-breakpoint
CREATE UNIQUE INDEX "memberships_space_user_uidx" ON "memberships" USING btree ("space_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "memberships_space_owner_uidx" ON "memberships" USING btree ("space_id") WHERE "memberships"."role" = 'owner';--> statement-breakpoint
CREATE INDEX "memberships_space_joined_idx" ON "memberships" USING btree ("space_id","joined_at" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "memberships_user_idx" ON "memberships" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "memberships_skills_gin_idx" ON "memberships" USING gin ("skills");--> statement-breakpoint
CREATE INDEX "memberships_embedding_hnsw_idx" ON "memberships" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "posts_community_created_idx" ON "posts" USING btree ("community_id","created_at" DESC NULLS FIRST) WHERE "posts"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "posts_space_created_idx" ON "posts" USING btree ("space_id","created_at" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "posts_space_fit_idx" ON "posts" USING btree ("space_id","ai_fit_score" DESC NULLS LAST) WHERE "posts"."analysis_status" = 'done';--> statement-breakpoint
CREATE INDEX "posts_space_analysis_idx" ON "posts" USING btree ("space_id","analysis_status") WHERE "posts"."analysis_status" <> 'done';--> statement-breakpoint
CREATE INDEX "posts_space_featured_idx" ON "posts" USING btree ("space_id","featured_at") WHERE "posts"."featured_at" is not null;--> statement-breakpoint
CREATE INDEX "posts_author_created_idx" ON "posts" USING btree ("author_membership_id","created_at");--> statement-breakpoint
CREATE INDEX "posts_deleted_idx" ON "posts" USING btree ("deleted_at") WHERE "posts"."deleted_at" is not null;--> statement-breakpoint
CREATE INDEX "posts_embedding_hnsw_idx" ON "posts" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "click_events_promotion_created_idx" ON "click_events" USING btree ("promotion_id","created_at");--> statement-breakpoint
CREATE INDEX "click_events_created_idx" ON "click_events" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "promotions_post_uidx" ON "promotions" USING btree ("post_id");--> statement-breakpoint
CREATE UNIQUE INDEX "promotions_space_showcase_slug_uidx" ON "promotions" USING btree ("space_id","showcase_slug");--> statement-breakpoint
CREATE UNIQUE INDEX "promotions_short_code_uidx" ON "promotions" USING btree ("short_code");--> statement-breakpoint
CREATE INDEX "promotions_space_created_idx" ON "promotions" USING btree ("space_id","created_at" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "comments_post_created_idx" ON "comments" USING btree ("post_id","created_at");--> statement-breakpoint
CREATE INDEX "comments_author_created_idx" ON "comments" USING btree ("author_membership_id","created_at");--> statement-breakpoint
CREATE INDEX "comments_deleted_idx" ON "comments" USING btree ("deleted_at") WHERE "comments"."deleted_at" is not null;--> statement-breakpoint
CREATE INDEX "signals_membership_idx" ON "signals" USING btree ("membership_id");--> statement-breakpoint
CREATE INDEX "team_members_post_status_idx" ON "team_members" USING btree ("post_id","status");--> statement-breakpoint
CREATE INDEX "team_members_membership_idx" ON "team_members" USING btree ("membership_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "spaces_handle_uidx" ON "spaces" USING btree ("handle");--> statement-breakpoint
CREATE UNIQUE INDEX "spaces_owner_user_id_uidx" ON "spaces" USING btree ("owner_user_id");