CREATE TABLE "follower_communities" (
	"follower_id" uuid NOT NULL,
	"community_id" uuid NOT NULL,
	"tagged_by" text DEFAULT 'creator' NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "follower_communities_pk" PRIMARY KEY("follower_id","community_id"),
	CONSTRAINT "follower_communities_tagged_by_check" CHECK ("follower_communities"."tagged_by" in ('creator', 'ai'))
);
--> statement-breakpoint
CREATE TABLE "followers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"space_id" uuid NOT NULL,
	"name" text NOT NULL,
	"handle" text,
	"platform" text,
	"email" text,
	"note" text,
	"source" text DEFAULT 'manual' NOT NULL,
	"import_id" uuid,
	"membership_id" uuid,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "followers_name_check" CHECK (char_length("followers"."name") between 1 and 80),
	CONSTRAINT "followers_handle_check" CHECK ("followers"."handle" is null or char_length("followers"."handle") between 1 and 60),
	CONSTRAINT "followers_email_check" CHECK ("followers"."email" is null or (char_length("followers"."email") <= 254 and "followers"."email" = lower("followers"."email"))),
	CONSTRAINT "followers_note_check" CHECK ("followers"."note" is null or char_length("followers"."note") <= 500),
	CONSTRAINT "followers_platform_check" CHECK ("followers"."platform" is null or "followers"."platform" in ('youtube', 'instagram', 'x', 'tiktok', 'linkedin', 'other')),
	CONSTRAINT "followers_source_check" CHECK ("followers"."source" in ('manual', 'csv', 'paste'))
);
--> statement-breakpoint
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_kind_check";--> statement-breakpoint
ALTER TABLE "follower_communities" ADD CONSTRAINT "follower_communities_follower_id_followers_id_fk" FOREIGN KEY ("follower_id") REFERENCES "public"."followers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follower_communities" ADD CONSTRAINT "follower_communities_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "followers" ADD CONSTRAINT "followers_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "followers" ADD CONSTRAINT "followers_import_id_imports_id_fk" FOREIGN KEY ("import_id") REFERENCES "public"."imports"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "followers" ADD CONSTRAINT "followers_membership_id_memberships_id_fk" FOREIGN KEY ("membership_id") REFERENCES "public"."memberships"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "follower_communities_community_idx" ON "follower_communities" USING btree ("community_id");--> statement-breakpoint
CREATE INDEX "followers_space_created_idx" ON "followers" USING btree ("space_id","created_at" DESC NULLS FIRST);--> statement-breakpoint
CREATE UNIQUE INDEX "followers_space_email_uidx" ON "followers" USING btree ("space_id","email") WHERE "followers"."email" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "followers_space_platform_handle_uidx" ON "followers" USING btree ("space_id",coalesce("platform", ''),lower("handle")) WHERE "followers"."handle" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "followers_membership_uidx" ON "followers" USING btree ("membership_id") WHERE "followers"."membership_id" is not null;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_kind_check" CHECK ("notifications"."kind" in ('reply_received', 'project_featured', 'team_request', 'team_decision', 'ask_posted', 'idea_posted', 'pitch_received', 'comment_received'));