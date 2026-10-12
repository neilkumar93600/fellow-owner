-- Repeat clicks (same promotion, visitor, platform, day) collapse to the first before the unique index. click_count keeps its lifetime total.
DELETE FROM "click_events" a USING "click_events" b WHERE a."promotion_id" = b."promotion_id" AND a."visitor_hash" = b."visitor_hash" AND a."platform" = b."platform" AND a."id" > b."id";--> statement-breakpoint
CREATE INDEX "ai_feedback_space_created_idx" ON "ai_feedback" USING btree ("space_id","created_at");--> statement-breakpoint
CREATE INDEX "inbound_ungrouped_created_idx" ON "inbound" USING btree ("created_at") WHERE "inbound"."question_group_id" is null and "inbound"."question_group_excluded" = false;--> statement-breakpoint
CREATE INDEX "notifications_unread_created_idx" ON "notifications" USING btree ("created_at") WHERE "notifications"."read_at" is null;--> statement-breakpoint
CREATE INDEX "page_visits_space_day_idx" ON "page_visits" USING btree ("space_id","day");--> statement-breakpoint
CREATE UNIQUE INDEX "click_events_promotion_visitor_platform_uidx" ON "click_events" USING btree ("promotion_id","visitor_hash","platform");