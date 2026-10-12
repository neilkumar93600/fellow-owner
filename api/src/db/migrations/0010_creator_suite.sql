CREATE TABLE "brand_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"space_id" uuid NOT NULL,
	"source" text NOT NULL,
	"external_id" text,
	"status" text DEFAULT 'new' NOT NULL,
	"brand_name" text NOT NULL,
	"contact_name" text,
	"email" text,
	"sender_handle" text,
	"website" text,
	"budget_range" text,
	"deliverables" text,
	"timeline" text,
	"subject" text,
	"message" text NOT NULL,
	"consented_at" timestamp (3) with time zone,
	"analysis_status" "analysis_status" DEFAULT 'pending' NOT NULL,
	"analysis_attempts" smallint DEFAULT 0 NOT NULL,
	"analysis_claimed_at" timestamp (3) with time zone,
	"scored_taste_version" integer,
	"ai_score" smallint,
	"ai_summary" text,
	"ai_flags" text[] DEFAULT '{}'::text[] NOT NULL,
	"ai_urgency" text,
	"received_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"read_at" timestamp (3) with time zone,
	"picked_at" timestamp (3) with time zone,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "brand_requests_source_check" CHECK ("brand_requests"."source" in ('form', 'email', 'instagram')),
	CONSTRAINT "brand_requests_status_check" CHECK ("brand_requests"."status" in ('new', 'shortlisted', 'replied', 'accepted', 'declined', 'archived', 'spam')),
	CONSTRAINT "brand_requests_budget_range_check" CHECK ("brand_requests"."budget_range" is null or "brand_requests"."budget_range" in ('under_500', '500_2000', '2000_5000', '5000_10000', '10000_plus', 'not_sure')),
	CONSTRAINT "brand_requests_ai_urgency_check" CHECK ("brand_requests"."ai_urgency" is null or "brand_requests"."ai_urgency" in ('low', 'normal', 'high')),
	CONSTRAINT "brand_requests_ai_score_check" CHECK ("brand_requests"."ai_score" is null or "brand_requests"."ai_score" between 0 and 100),
	CONSTRAINT "brand_requests_ai_summary_check" CHECK ("brand_requests"."ai_summary" is null or char_length("brand_requests"."ai_summary") <= 140),
	CONSTRAINT "brand_requests_analysis_attempts_check" CHECK ("brand_requests"."analysis_attempts" >= 0),
	CONSTRAINT "brand_requests_brand_name_check" CHECK (char_length("brand_requests"."brand_name") between 1 and 120),
	CONSTRAINT "brand_requests_contact_name_check" CHECK ("brand_requests"."contact_name" is null or char_length("brand_requests"."contact_name") <= 100),
	CONSTRAINT "brand_requests_email_check" CHECK ("brand_requests"."email" is null or (char_length("brand_requests"."email") <= 254 and "brand_requests"."email" = lower("brand_requests"."email"))),
	CONSTRAINT "brand_requests_sender_handle_check" CHECK ("brand_requests"."sender_handle" is null or char_length("brand_requests"."sender_handle") <= 100),
	CONSTRAINT "brand_requests_website_check" CHECK ("brand_requests"."website" is null or char_length("brand_requests"."website") <= 2048),
	CONSTRAINT "brand_requests_deliverables_check" CHECK ("brand_requests"."deliverables" is null or char_length("brand_requests"."deliverables") <= 1000),
	CONSTRAINT "brand_requests_timeline_check" CHECK ("brand_requests"."timeline" is null or char_length("brand_requests"."timeline") <= 200),
	CONSTRAINT "brand_requests_subject_check" CHECK ("brand_requests"."subject" is null or char_length("brand_requests"."subject") <= 200),
	CONSTRAINT "brand_requests_message_check" CHECK (char_length("brand_requests"."message") between 1 and 5000)
);
--> statement-breakpoint
CREATE TABLE "instagram_connections" (
	"space_id" uuid PRIMARY KEY NOT NULL,
	"ig_user_id" text NOT NULL,
	"username" text,
	"access_token_enc" text NOT NULL,
	"token_expires_at" timestamp (3) with time zone,
	"scopes" text[] DEFAULT '{}'::text[] NOT NULL,
	"connected_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"last_event_at" timestamp (3) with time zone,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "instagram_connections_token_check" CHECK ("instagram_connections"."access_token_enc" ~ '^v[0-9]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$')
);
--> statement-breakpoint
CREATE TABLE "poll_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"poll_id" uuid NOT NULL,
	"space_id" uuid NOT NULL,
	"label" text NOT NULL,
	"position" smallint NOT NULL,
	CONSTRAINT "poll_options_poll_id_unique" UNIQUE("poll_id","id"),
	CONSTRAINT "poll_options_label_check" CHECK (char_length("poll_options"."label") between 1 and 80),
	CONSTRAINT "poll_options_position_check" CHECK ("poll_options"."position" between 0 and 5)
);
--> statement-breakpoint
CREATE TABLE "poll_votes" (
	"poll_id" uuid NOT NULL,
	"option_id" uuid NOT NULL,
	"membership_id" uuid NOT NULL,
	"space_id" uuid NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "poll_votes_pk" PRIMARY KEY("option_id","membership_id")
);
--> statement-breakpoint
CREATE TABLE "polls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"space_id" uuid NOT NULL,
	"created_by_membership_id" uuid,
	"question" text NOT NULL,
	"multi" boolean DEFAULT false NOT NULL,
	"closes_at" timestamp (3) with time zone,
	"closed_at" timestamp (3) with time zone,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "polls_question_check" CHECK (char_length("polls"."question") between 5 and 200)
);
--> statement-breakpoint
CREATE TABLE "post_follows" (
	"post_id" uuid NOT NULL,
	"membership_id" uuid NOT NULL,
	"space_id" uuid NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "post_follows_pk" PRIMARY KEY("post_id","membership_id")
);
--> statement-breakpoint
CREATE TABLE "project_updates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"space_id" uuid NOT NULL,
	"author_membership_id" uuid,
	"body" text NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_updates_body_check" CHECK (char_length("project_updates"."body") between 1 and 2000)
);
--> statement-breakpoint
CREATE TABLE "platform_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"space_id" uuid NOT NULL,
	"platform" text NOT NULL,
	"profile_url" text NOT NULL,
	"external_id" text NOT NULL,
	"url" text NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"posted_at" timestamp (3) with time zone,
	"views" bigint,
	"likes" bigint,
	"comments" bigint,
	"source" text DEFAULT 'live' NOT NULL,
	"fetched_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "platform_posts_platform_check" CHECK ("platform_posts"."platform" in ('youtube', 'instagram', 'x', 'tiktok', 'linkedin', 'other')),
	CONSTRAINT "platform_posts_source_check" CHECK ("platform_posts"."source" in ('live', 'manual', 'sample')),
	CONSTRAINT "platform_posts_title_check" CHECK (char_length("platform_posts"."title") <= 300),
	CONSTRAINT "platform_posts_counts_check" CHECK (coalesce("platform_posts"."views", 0) >= 0 and coalesce("platform_posts"."likes", 0) >= 0 and coalesce("platform_posts"."comments", 0) >= 0)
);
--> statement-breakpoint
CREATE TABLE "platform_snapshots" (
	"space_id" uuid NOT NULL,
	"platform" text NOT NULL,
	"profile_url" text NOT NULL,
	"handle" text,
	"day" date NOT NULL,
	"followers" integer NOT NULL,
	"source" text DEFAULT 'live' NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "platform_snapshots_pk" PRIMARY KEY("space_id","profile_url","day"),
	CONSTRAINT "platform_snapshots_platform_check" CHECK ("platform_snapshots"."platform" in ('youtube', 'instagram', 'x', 'tiktok', 'linkedin', 'other')),
	CONSTRAINT "platform_snapshots_source_check" CHECK ("platform_snapshots"."source" in ('live', 'manual', 'sample')),
	CONSTRAINT "platform_snapshots_followers_check" CHECK ("platform_snapshots"."followers" >= 0)
);
--> statement-breakpoint
CREATE TABLE "plan_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"space_id" uuid NOT NULL,
	"title" text NOT NULL,
	"caption" text,
	"platforms" text[] DEFAULT '{}'::text[] NOT NULL,
	"link" text,
	"media_note" text,
	"scheduled_at" timestamp (3) with time zone NOT NULL,
	"status" text DEFAULT 'planned' NOT NULL,
	"reminded_at" timestamp (3) with time zone,
	"completed_at" timestamp (3) with time zone,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "plan_items_title_check" CHECK (char_length("plan_items"."title") between 1 and 120),
	CONSTRAINT "plan_items_caption_check" CHECK ("plan_items"."caption" is null or char_length("plan_items"."caption") <= 5000),
	CONSTRAINT "plan_items_media_note_check" CHECK ("plan_items"."media_note" is null or char_length("plan_items"."media_note") <= 500),
	CONSTRAINT "plan_items_link_check" CHECK ("plan_items"."link" is null or char_length("plan_items"."link") <= 2048),
	CONSTRAINT "plan_items_platforms_check" CHECK (cardinality("plan_items"."platforms") between 1 and 6 and "plan_items"."platforms" <@ array['youtube', 'instagram', 'x', 'tiktok', 'linkedin', 'other']::text[]),
	CONSTRAINT "plan_items_status_check" CHECK ("plan_items"."status" in ('planned', 'reminded', 'posted', 'skipped'))
);
--> statement-breakpoint
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_kind_check";--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "age_confirmed_at" timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "feedback_wanted_at" timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "backed_at" timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "backed_note" text;--> statement-breakpoint
ALTER TABLE "spaces" ADD COLUMN "inbound_email_alias" text;--> statement-breakpoint
ALTER TABLE "spaces" ADD COLUMN "media_kit_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "spaces" ADD COLUMN "media_kit_rates" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "spaces" ADD COLUMN "media_kit_note" text;--> statement-breakpoint
ALTER TABLE "brand_requests" ADD CONSTRAINT "brand_requests_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instagram_connections" ADD CONSTRAINT "instagram_connections_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poll_options" ADD CONSTRAINT "poll_options_poll_id_polls_id_fk" FOREIGN KEY ("poll_id") REFERENCES "public"."polls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poll_options" ADD CONSTRAINT "poll_options_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poll_votes" ADD CONSTRAINT "poll_votes_membership_id_memberships_id_fk" FOREIGN KEY ("membership_id") REFERENCES "public"."memberships"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poll_votes" ADD CONSTRAINT "poll_votes_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poll_votes" ADD CONSTRAINT "poll_votes_option_fk" FOREIGN KEY ("poll_id","option_id") REFERENCES "public"."poll_options"("poll_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "polls" ADD CONSTRAINT "polls_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "polls" ADD CONSTRAINT "polls_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "polls" ADD CONSTRAINT "polls_created_by_membership_id_memberships_id_fk" FOREIGN KEY ("created_by_membership_id") REFERENCES "public"."memberships"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_follows" ADD CONSTRAINT "post_follows_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_follows" ADD CONSTRAINT "post_follows_membership_id_memberships_id_fk" FOREIGN KEY ("membership_id") REFERENCES "public"."memberships"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_follows" ADD CONSTRAINT "post_follows_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_updates" ADD CONSTRAINT "project_updates_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_updates" ADD CONSTRAINT "project_updates_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_updates" ADD CONSTRAINT "project_updates_author_membership_id_memberships_id_fk" FOREIGN KEY ("author_membership_id") REFERENCES "public"."memberships"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_posts" ADD CONSTRAINT "platform_posts_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_snapshots" ADD CONSTRAINT "platform_snapshots_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_items" ADD CONSTRAINT "plan_items_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "brand_requests_space_received_idx" ON "brand_requests" USING btree ("space_id","received_at" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "brand_requests_space_status_received_idx" ON "brand_requests" USING btree ("space_id","status","received_at" DESC NULLS FIRST);--> statement-breakpoint
CREATE UNIQUE INDEX "brand_requests_space_source_external_uidx" ON "brand_requests" USING btree ("space_id","source","external_id") WHERE "brand_requests"."external_id" is not null;--> statement-breakpoint
CREATE INDEX "brand_requests_analysis_idx" ON "brand_requests" USING btree ("space_id","analysis_status") WHERE "brand_requests"."analysis_status" <> 'done';--> statement-breakpoint
CREATE UNIQUE INDEX "instagram_connections_ig_user_uidx" ON "instagram_connections" USING btree ("ig_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "poll_options_poll_position_uidx" ON "poll_options" USING btree ("poll_id","position");--> statement-breakpoint
CREATE INDEX "poll_votes_poll_membership_idx" ON "poll_votes" USING btree ("poll_id","membership_id");--> statement-breakpoint
CREATE INDEX "poll_votes_membership_idx" ON "poll_votes" USING btree ("membership_id");--> statement-breakpoint
CREATE UNIQUE INDEX "polls_post_uidx" ON "polls" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "polls_space_idx" ON "polls" USING btree ("space_id");--> statement-breakpoint
CREATE INDEX "post_follows_membership_idx" ON "post_follows" USING btree ("membership_id");--> statement-breakpoint
CREATE INDEX "post_follows_space_idx" ON "post_follows" USING btree ("space_id");--> statement-breakpoint
CREATE INDEX "project_updates_post_created_idx" ON "project_updates" USING btree ("post_id","created_at" DESC NULLS FIRST,"id" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "project_updates_author_created_idx" ON "project_updates" USING btree ("author_membership_id","created_at");--> statement-breakpoint
CREATE INDEX "project_updates_space_idx" ON "project_updates" USING btree ("space_id");--> statement-breakpoint
CREATE UNIQUE INDEX "platform_posts_space_platform_external_uidx" ON "platform_posts" USING btree ("space_id","platform","external_id");--> statement-breakpoint
CREATE INDEX "platform_posts_space_posted_idx" ON "platform_posts" USING btree ("space_id","posted_at");--> statement-breakpoint
CREATE INDEX "platform_snapshots_space_day_idx" ON "platform_snapshots" USING btree ("space_id","day");--> statement-breakpoint
CREATE INDEX "plan_items_space_scheduled_idx" ON "plan_items" USING btree ("space_id","scheduled_at");--> statement-breakpoint
CREATE INDEX "plan_items_due_idx" ON "plan_items" USING btree ("scheduled_at") WHERE "plan_items"."status" = 'planned' and "plan_items"."reminded_at" is null;--> statement-breakpoint
CREATE INDEX "posts_community_feedback_idx" ON "posts" USING btree ("community_id","feedback_wanted_at" DESC NULLS LAST) WHERE "posts"."feedback_wanted_at" is not null and "posts"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "posts_space_backed_idx" ON "posts" USING btree ("space_id","backed_at") WHERE "posts"."backed_at" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "spaces_inbound_email_alias_uidx" ON "spaces" USING btree ("inbound_email_alias") WHERE "spaces"."inbound_email_alias" is not null;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_kind_check" CHECK ("notifications"."kind" in ('reply_received', 'project_featured', 'team_request', 'team_decision', 'ask_posted', 'idea_posted', 'pitch_received', 'comment_received', 'post_loved', 'spotlighted', 'challenge_shortlisted', 'report_filed', 'planner_reminder', 'poll_voted', 'project_updated', 'project_backed', 'brand_request_received'));--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_backed_note_check" CHECK ("posts"."backed_note" is null or char_length("posts"."backed_note") <= 280);--> statement-breakpoint
ALTER TABLE "spaces" ADD CONSTRAINT "spaces_inbound_email_alias_check" CHECK ("spaces"."inbound_email_alias" is null or "spaces"."inbound_email_alias" ~ '^[a-z0-9][a-z0-9._-]{2,62}$');--> statement-breakpoint
ALTER TABLE "spaces" ADD CONSTRAINT "spaces_media_kit_rates_check" CHECK (jsonb_typeof("spaces"."media_kit_rates") = 'array' and jsonb_array_length("spaces"."media_kit_rates") <= 8);--> statement-breakpoint
ALTER TABLE "spaces" ADD CONSTRAINT "spaces_media_kit_note_check" CHECK ("spaces"."media_kit_note" is null or char_length("spaces"."media_kit_note") <= 600);