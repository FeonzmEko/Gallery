CREATE TABLE `entries` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`type` text NOT NULL,
	`slug` text,
	`title` text NOT NULL,
	`summary` text,
	`cover_media_id` text,
	`occurred_at` integer NOT NULL,
	`visibility` text DEFAULT 'public' NOT NULL,
	`status` text DEFAULT 'published' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_entries_public_feed` ON `entries` (`visibility`,`status`,`deleted_at`,"occurred_at" desc);--> statement-breakpoint
CREATE INDEX `idx_entries_timeline` ON `entries` (`owner_id`,`deleted_at`,`status`,"occurred_at" desc);--> statement-breakpoint
CREATE INDEX `idx_entries_type_time` ON `entries` (`type`,`visibility`,`status`,"occurred_at" desc);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_entries_slug` ON `entries` (`slug`);--> statement-breakpoint
CREATE TABLE `entry_relations` (
	`id` text PRIMARY KEY NOT NULL,
	`source_entry_id` text NOT NULL,
	`target_entry_id` text NOT NULL,
	`relation_type` text NOT NULL,
	`note` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`source_entry_id`) REFERENCES `entries`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`target_entry_id`) REFERENCES `entries`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_entry_relations_unique` ON `entry_relations` (`source_entry_id`,`target_entry_id`,`relation_type`);--> statement-breakpoint
CREATE INDEX `idx_entry_relations_target` ON `entry_relations` (`target_entry_id`,`relation_type`);--> statement-breakpoint
CREATE TABLE `entry_search_index` (
	`entry_id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`visibility` text NOT NULL,
	`title_normalized` text NOT NULL,
	`tags_text` text,
	`body_excerpt` text,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`entry_id`) REFERENCES `entries`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_search_visibility_type` ON `entry_search_index` (`visibility`,`type`);--> statement-breakpoint
CREATE INDEX `idx_search_title` ON `entry_search_index` (`title_normalized`);--> statement-breakpoint
CREATE TABLE `entry_tags` (
	`entry_id` text NOT NULL,
	`tag_id` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`entry_id`, `tag_id`),
	FOREIGN KEY (`entry_id`) REFERENCES `entries`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_entry_tags_tag_entry` ON `entry_tags` (`tag_id`,`entry_id`);--> statement-breakpoint
CREATE TABLE `tags` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`color` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_tags_owner_slug` ON `tags` (`owner_id`,`slug`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`display_name` text NOT NULL,
	`password_hash` text,
	`role` text DEFAULT 'owner' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_users_email` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `entry_media` (
	`id` text PRIMARY KEY NOT NULL,
	`entry_id` text NOT NULL,
	`media_id` text NOT NULL,
	`role` text DEFAULT 'gallery' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`caption` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`media_id`) REFERENCES `media_assets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_entry_media_entry_role_order` ON `entry_media` (`entry_id`,`role`,`sort_order`);--> statement-breakpoint
CREATE INDEX `idx_entry_media_media` ON `entry_media` (`media_id`);--> statement-breakpoint
CREATE TABLE `media_assets` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`storage_provider` text DEFAULT 'r2' NOT NULL,
	`bucket_key` text NOT NULL,
	`thumb_key` text,
	`preview_key` text,
	`mime_type` text NOT NULL,
	`media_type` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`sha256` text,
	`width` integer,
	`height` integer,
	`duration_ms` integer,
	`upload_status` text DEFAULT 'pending' NOT NULL,
	`visibility` text DEFAULT 'public' NOT NULL,
	`original_filename` text,
	`created_at` integer NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_media_bucket_key` ON `media_assets` (`bucket_key`);--> statement-breakpoint
CREATE INDEX `idx_media_owner_deleted` ON `media_assets` (`owner_id`,`deleted_at`);--> statement-breakpoint
CREATE INDEX `idx_media_upload_status` ON `media_assets` (`upload_status`);--> statement-breakpoint
CREATE INDEX `idx_media_sha256` ON `media_assets` (`sha256`);--> statement-breakpoint
CREATE TABLE `comments` (
	`id` text PRIMARY KEY NOT NULL,
	`entry_id` text NOT NULL,
	`parent_id` text,
	`author_name` text NOT NULL,
	`author_email` text NOT NULL,
	`author_url` text,
	`content` text NOT NULL,
	`status` text DEFAULT 'approved' NOT NULL,
	`ip_hash` text NOT NULL,
	`user_agent` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_comments_entry_time` ON `comments` (`entry_id`,`status`,`created_at`);