-- Removes the demo account system's data. A no-op on a database without demo data (fresh and test
-- databases). The spaces.is_demo column stays for now: Railway runs this while the previous API is
-- still serving, and that code selects is_demo by name on every space read (and a rollback would
-- too). Nothing reads it any more and its default is false, so a later migration drops it.
--
-- Seeded demo accounts, identified with certainty:
--   1. the owner of an is_demo space (the seeded creator; only the seed ever set is_demo),
--   2. every @example.com address: the seeded creator, fans and 'seed-member-NNNN' accounts, and any
--      earlier DEMO_FAN_EMAIL (production once used arjun@example.com). No person can hold one:
--      example.com is reserved (RFC 2606) and receives no mail, sign-up requires the emailed code
--      (requireEmailVerification), and no social provider issues that domain.
CREATE TEMP TABLE "demo_users" AS
SELECT "u"."id", lower("u"."email") AS "email"
FROM "user" "u"
WHERE "u"."id" IN (SELECT "owner_user_id" FROM "spaces" WHERE "is_demo" = true)
  OR lower("u"."email") LIKE '%@example.com';--> statement-breakpoint
-- The demo spaces: every table with a space_id cascades (communities, posts, memberships, ...).
DELETE FROM "spaces" WHERE "is_demo" = true;--> statement-breakpoint
-- Their email codes: verification has no foreign key (identifier is "<type>-otp-<email>").
DELETE FROM "verification" "v" USING "demo_users" "d"
WHERE right("v"."identifier", length("d"."email") + 5) = '-otp-' || "d"."email";--> statement-breakpoint
-- The accounts: session, account, memberships and notifications cascade; ai_runs, reports and
-- support_requests keep their rows with user_id set to null.
DELETE FROM "user" WHERE "id" IN (SELECT "id" FROM "demo_users");--> statement-breakpoint
DROP TABLE "demo_users";--> statement-breakpoint
-- job_runs.job is text: drop the history of the removed jobs.
DELETE FROM "job_runs" WHERE "job" IN ('demo_reset', 'demo_briefing');
