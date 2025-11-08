CREATE TABLE `admin_user_event` (
  `id` text PRIMARY KEY NOT NULL,
  `createdAt` integer NOT NULL,
  `updatedAt` integer NOT NULL,
  `updateCounter` integer NOT NULL DEFAULT 0,
  `userId` text,
  `email` text,
  `eventType` text NOT NULL,
  `metadata` text,
  `context` text
);
--> statement-breakpoint
CREATE INDEX `admin_user_event_type_idx` ON `admin_user_event` (`eventType`);
--> statement-breakpoint
CREATE INDEX `admin_user_event_user_idx` ON `admin_user_event` (`userId`);
