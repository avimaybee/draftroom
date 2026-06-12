CREATE TABLE `activities` (
	`id` text PRIMARY KEY NOT NULL,
	`lead_id` text NOT NULL,
	`type` text NOT NULL,
	`summary` text NOT NULL,
	`timestamp` integer DEFAULT (strftime('%s', 'now')),
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `leads` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`company` text,
	`email` text,
	`phone` text,
	`website` text,
	`city` text,
	`region` text,
	`industry` text,
	`stage` text DEFAULT 'New' NOT NULL,
	`status` text DEFAULT 'Active' NOT NULL,
	`triage_priority` text DEFAULT 'UNASSESSED',
	`triage_reason` text,
	`owner_id` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	`updated_at` integer DEFAULT (strftime('%s', 'now')),
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `notes` (
	`id` text PRIMARY KEY NOT NULL,
	`lead_id` text NOT NULL,
	`author_id` text,
	`body` text NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `provider_configs` (
	`id` text PRIMARY KEY NOT NULL,
	`provider` text NOT NULL,
	`api_key` text NOT NULL,
	`model_name` text NOT NULL,
	`is_active` integer DEFAULT true,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	`updated_at` integer DEFAULT (strftime('%s', 'now'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `provider_configs_provider_unique` ON `provider_configs` (`provider`);--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`lead_id` text,
	`due_date` integer,
	`status` text DEFAULT 'Open' NOT NULL,
	`priority` text DEFAULT 'Medium' NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	`updated_at` integer DEFAULT (strftime('%s', 'now')),
	`completed_at` integer,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`password` text NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	`updated_at` integer DEFAULT (strftime('%s', 'now'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `candidate_leads` (
	`id` text PRIMARY KEY NOT NULL,
	`discovery_scope_id` text,
	`raw_name` text NOT NULL,
	`raw_website_url` text,
	`raw_contact_info` text,
	`raw_location` text,
	`notes` text,
	`status` text DEFAULT 'NEW' NOT NULL,
	`promoted_lead_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`discovery_scope_id`) REFERENCES `discovery_scopes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `discovery_scopes` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`industry_filter` text,
	`geography_filter` text,
	`company_size_filter` text,
	`business_type_filter` text,
	`digital_presence_filter` text,
	`notes` text,
	`created_by_user_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `contacts` (
	`id` text PRIMARY KEY NOT NULL,
	`lead_id` text NOT NULL,
	`full_name` text,
	`role_title` text,
	`email` text,
	`phone` text,
	`linkedin_url` text,
	`other_profile_url` text,
	`is_primary` integer DEFAULT 0 NOT NULL,
	`confidence_level` text DEFAULT 'UNKNOWN' NOT NULL,
	`source_type` text DEFAULT 'MANUAL' NOT NULL,
	`created_by_user_id` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	`updated_at` integer DEFAULT (strftime('%s', 'now')),
	`deleted_at` integer,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `job_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`job_type` text NOT NULL,
	`status` text NOT NULL,
	`target_lead_id` text,
	`triggered_by_user_id` text,
	`error_summary` text,
	`started_at` integer,
	`finished_at` integer,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	FOREIGN KEY (`target_lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`triggered_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `research_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`lead_id` text NOT NULL,
	`created_by_user_id` text,
	`origin` text DEFAULT 'AI_GENERATED' NOT NULL,
	`snapshot_title` text,
	`company_summary` text,
	`products_services_summary` text,
	`digital_presence_notes` text,
	`website_notes` text,
	`branding_notes` text,
	`pain_points_hypotheses` text,
	`opportunity_hypotheses` text,
	`sources` text,
	`confidence_level` text DEFAULT 'UNKNOWN' NOT NULL,
	`user_remarks` text,
	`job_run_id` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	`updated_at` integer DEFAULT (strftime('%s', 'now')),
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`job_run_id`) REFERENCES `job_runs`(`id`) ON UPDATE no action ON DELETE no action
);
