CREATE TABLE `site_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value_json` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `media_collections` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`cover_media_id` text,
	`occurred_range` text,
	`visibility` text DEFAULT 'public' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_media_collections_slug` ON `media_collections` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_media_collections_visibility_created` ON `media_collections` (`visibility`,`created_at`);--> statement-breakpoint
CREATE TABLE `media_collection_items` (
	`collection_id` text NOT NULL,
	`media_asset_id` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`added_at` integer NOT NULL,
	PRIMARY KEY(`collection_id`, `media_asset_id`),
	FOREIGN KEY (`collection_id`) REFERENCES `media_collections`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`media_asset_id`) REFERENCES `media_assets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_media_collection_items_order` ON `media_collection_items` (`collection_id`,`sort_order`);--> statement-breakpoint
CREATE INDEX `idx_media_collection_items_media` ON `media_collection_items` (`media_asset_id`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_comments` (
	`id` text PRIMARY KEY NOT NULL,
	`entry_id` text,
	`media_asset_id` text,
	`parent_id` text,
	`author_name` text NOT NULL,
	`author_email` text NOT NULL,
	`author_url` text,
	`content` text NOT NULL,
	`status` text DEFAULT 'approved' NOT NULL,
	`is_curator_note` integer DEFAULT 0 NOT NULL,
	`ip_hash` text NOT NULL,
	`user_agent` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_comments`("id", "entry_id", "media_asset_id", "parent_id", "author_name", "author_email", "author_url", "content", "status", "is_curator_note", "ip_hash", "user_agent", "created_at") SELECT "id", "entry_id", NULL, "parent_id", "author_name", "author_email", "author_url", "content", "status", 0, "ip_hash", "user_agent", "created_at" FROM `comments`;--> statement-breakpoint
DROP TABLE `comments`;--> statement-breakpoint
ALTER TABLE `__new_comments` RENAME TO `comments`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `idx_comments_entry_time` ON `comments` (`entry_id`,`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_comments_media_time` ON `comments` (`media_asset_id`,`status`,`created_at`);