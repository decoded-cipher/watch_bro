CREATE TABLE `items` (
	`id` integer PRIMARY KEY NOT NULL,
	`title` text,
	`type` text,
	`poster_path` text
);
--> statement-breakpoint
CREATE TABLE `watch_events` (
	`id` text PRIMARY KEY NOT NULL,
	`item_id` integer,
	`watched_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE no action
);
