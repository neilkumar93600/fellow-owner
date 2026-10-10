CREATE TABLE "newsletter_subscribers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"source" text DEFAULT 'footer' NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"unsubscribed_at" timestamp (3) with time zone
);
--> statement-breakpoint
CREATE UNIQUE INDEX "newsletter_subscribers_email_key" ON "newsletter_subscribers" USING btree ("email");