PRAGMA foreign_keys=OFF;
--> statement-breakpoint
CREATE TABLE `__new_admin_system_settings` (
  `id` text PRIMARY KEY NOT NULL,
  `createdAt` integer NOT NULL,
  `updatedAt` integer NOT NULL,
  `updateCounter` integer NOT NULL DEFAULT 0,
  `enablePacks` integer NOT NULL DEFAULT 1,
  `enableSubscriptions` integer NOT NULL DEFAULT 1,
  `subsUnlimitedMode` text NOT NULL DEFAULT 'off',
  `subsUnlimitedAlsoGrantCredits` integer NOT NULL DEFAULT 0,
  `dailyFreeCreditsEnabled` integer NOT NULL DEFAULT 1,
  `dailyFreeCredits` integer NOT NULL DEFAULT 10,
  `dailyFreeReset` integer NOT NULL DEFAULT 0,
  `perUseCreditCost` integer NOT NULL DEFAULT 1,
  `guestDailyFreeEnabled` integer NOT NULL DEFAULT 1,
  `guestDailyFreeCredits` integer NOT NULL DEFAULT 10,
  `guestIpDailyLimit` integer NOT NULL DEFAULT 10,
  `guestDeviceDailyLimit` integer NOT NULL DEFAULT 100,
  `guestIpDailyCap` integer NOT NULL DEFAULT 20,
  `featureDashboardHome` integer NOT NULL DEFAULT 1,
  `featureDashboardTeams` integer NOT NULL DEFAULT 1,
  `featureDashboardMarketplace` integer NOT NULL DEFAULT 1,
  `featureDashboardBilling` integer NOT NULL DEFAULT 1,
  `featureDashboardSettings` integer NOT NULL DEFAULT 1,
  `dashboardHomeRoute` text NOT NULL DEFAULT '/dashboard/billing'
);
--> statement-breakpoint
INSERT INTO `__new_admin_system_settings` (
  `id`,
  `createdAt`,
  `updatedAt`,
  `updateCounter`,
  `enablePacks`,
  `enableSubscriptions`,
  `subsUnlimitedMode`,
  `subsUnlimitedAlsoGrantCredits`,
  `dailyFreeCreditsEnabled`,
  `dailyFreeCredits`,
  `dailyFreeReset`,
  `perUseCreditCost`,
  `guestDailyFreeEnabled`,
  `guestDailyFreeCredits`,
  `guestIpDailyLimit`,
  `guestDeviceDailyLimit`,
  `guestIpDailyCap`,
  `featureDashboardHome`,
  `featureDashboardTeams`,
  `featureDashboardMarketplace`,
  `featureDashboardBilling`,
  `featureDashboardSettings`,
  `dashboardHomeRoute`
)
SELECT
  `id`,
  `createdAt`,
  `updatedAt`,
  `updateCounter`,
  `enablePacks`,
  `enableSubscriptions`,
  `subsUnlimitedMode`,
  `subsUnlimitedAlsoGrantCredits`,
  `dailyFreeCreditsEnabled`,
  `dailyFreeCredits`,
  `dailyFreeReset`,
  `perUseCreditCost`,
  `guestDailyFreeEnabled`,
  `guestDailyFreeCredits`,
  `guestIpDailyLimit`,
  `guestDeviceDailyLimit`,
  `guestIpDailyCap`,
  `featureDashboardHome`,
  `featureDashboardTeams`,
  `featureDashboardMarketplace`,
  `featureDashboardBilling`,
  `featureDashboardSettings`,
  `dashboardHomeRoute`
FROM `admin_system_settings`;
--> statement-breakpoint
DROP TABLE `admin_system_settings`;
--> statement-breakpoint
ALTER TABLE `__new_admin_system_settings` RENAME TO `admin_system_settings`;
--> statement-breakpoint
PRAGMA foreign_keys=ON;
