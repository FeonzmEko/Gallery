CREATE TABLE IF NOT EXISTS `journal_entries` (
	`entry_id` text PRIMARY KEY NOT NULL,
	`content_markdown` text NOT NULL,
	`word_count` integer DEFAULT 0 NOT NULL,
	`mood` text,
	`weather` text,
	FOREIGN KEY (`entry_id`) REFERENCES `entries`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `trips` (
	`entry_id` text PRIMARY KEY NOT NULL,
	`start_date` integer NOT NULL,
	`end_date` integer NOT NULL,
	`country_code` text,
	`city_summary` text,
	`distance_km` real DEFAULT 0,
	FOREIGN KEY (`entry_id`) REFERENCES `entries`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `trip_locations` (
	`id` text PRIMARY KEY NOT NULL,
	`trip_entry_id` text NOT NULL,
	`name` text NOT NULL,
	`latitude` real NOT NULL,
	`longitude` real NOT NULL,
	`visited_at` integer,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`notes` text,
	FOREIGN KEY (`trip_entry_id`) REFERENCES `trips`(`entry_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_trip_locations_trip_order` ON `trip_locations` (`trip_entry_id`,`sort_order`);
--> statement-breakpoint
ALTER TABLE `media_assets` ADD COLUMN `exif_json` text;
