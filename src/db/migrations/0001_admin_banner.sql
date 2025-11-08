CREATE TABLE `admin_banner_settings` (
  `id` text PRIMARY KEY NOT NULL,
  `createdAt` integer NOT NULL,
  `updatedAt` integer NOT NULL,
  `isEnabled` integer NOT NULL DEFAULT 0,
  `messages` text NOT NULL,
  `itemsPerCycle` integer NOT NULL DEFAULT 1
);
--> statement-breakpoint
INSERT INTO `admin_banner_settings` (
  `id`,
  `createdAt`,
  `updatedAt`,
  `isEnabled`,
  `messages`,
  `itemsPerCycle`
)
VALUES (
  'default',
  CAST(strftime('%s', 'now') AS INTEGER),
  CAST(strftime('%s', 'now') AS INTEGER),
  0,
  '[]',
  1
);
