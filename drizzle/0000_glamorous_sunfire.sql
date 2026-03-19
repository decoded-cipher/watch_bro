CREATE TABLE `items` (
	`id` integer PRIMARY KEY NOT NULL,
	`title` text,
	`type` text,
	`poster_path` text
);
--> statement-breakpoint
CREATE TABLE `search_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`chat_id` integer,
	`results` text,
	`current_index` integer DEFAULT 0,
	`message_id` integer,
	`created_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`telegram_id` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_telegram_id_unique` ON `users` (`telegram_id`);--> statement-breakpoint
CREATE TABLE `watch_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer,
	`item_id` integer,
	`watched_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE no action
);
