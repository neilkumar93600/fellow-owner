ALTER TABLE "notifications" DROP CONSTRAINT "notifications_kind_check";--> statement-breakpoint
ALTER TYPE "public"."pitch_type" RENAME VALUE 'investment' TO 'brand_deal';--> statement-breakpoint
ALTER TABLE "memberships" ADD COLUMN "spotlight_at" timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "memberships" ADD COLUMN "spotlight_note" text;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "loved_at" timestamp (3) with time zone;--> statement-breakpoint
CREATE INDEX "posts_ask_idx" ON "posts" USING btree ("ask_id");--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_kind_check" CHECK ("notifications"."kind" in ('reply_received', 'project_featured', 'team_request', 'team_decision', 'ask_posted', 'idea_posted', 'pitch_received', 'comment_received', 'post_loved', 'spotlighted', 'challenge_shortlisted'));--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_spotlight_note_check" CHECK ("memberships"."spotlight_note" is null or char_length("memberships"."spotlight_note") <= 280);