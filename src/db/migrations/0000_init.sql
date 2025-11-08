CREATE TABLE `user` (
  `id` text PRIMARY KEY NOT NULL,
  `createdAt` integer NOT NULL,
  `updatedAt` integer NOT NULL,
  `firstName` text(255),
  `lastName` text(255),
  `email` text(255),
  `passwordHash` text,
  `role` text DEFAULT 'user' NOT NULL,
  `unlimitedUsageUntil` integer NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);
<<<<<<< HEAD

=======
>>>>>>> c318bc0da412ee36ceda80e704d3f01a4ace9cc2
