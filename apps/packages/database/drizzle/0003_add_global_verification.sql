ALTER TABLE "document_versions" ADD COLUMN "verified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "document_versions" ADD COLUMN "verified_by" uuid;--> statement-breakpoint
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
