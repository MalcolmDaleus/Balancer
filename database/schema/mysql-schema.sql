-- Balancer Wave 5 C7 squash — MySQL final schema (generated)
SET FOREIGN_KEY_CHECKS=0;

DROP TABLE IF EXISTS `balance_sheet_totals`;
CREATE TABLE `balance_sheet_totals` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned NOT NULL,
  `month` date NOT NULL,
  `total_income` decimal(12,2) NOT NULL DEFAULT 0.00,
  `total_debt_paid` decimal(12,2) NOT NULL DEFAULT 0.00,
  `total_spending` decimal(12,2) NOT NULL DEFAULT 0.00,
  `total_recurring` decimal(12,2) NOT NULL DEFAULT 0.00,
  `savings_snapshot` decimal(12,2) NOT NULL DEFAULT 0.00,
  `roll_over` decimal(12,2) NOT NULL DEFAULT 0.00,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `bst_user_month_unique` (`user_id`,`month`),
  KEY `balance_sheet_totals_month_index` (`month`),
  CONSTRAINT `balance_sheet_totals_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `cache`;
CREATE TABLE `cache` (
  `key` varchar(255) NOT NULL,
  `value` mediumtext NOT NULL,
  `expiration` int(11) NOT NULL,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `cache_locks`;
CREATE TABLE `cache_locks` (
  `key` varchar(255) NOT NULL,
  `owner` varchar(255) NOT NULL,
  `expiration` int(11) NOT NULL,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `debt_categories`;
CREATE TABLE `debt_categories` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned NOT NULL,
  `name` varchar(64) NOT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `debt_categories_user_id_category_name_unique` (`user_id`,`name`),
  CONSTRAINT `debt_categories_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `debt_payments`;
CREATE TABLE `debt_payments` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned NOT NULL,
  `debt_id` bigint(20) unsigned NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `paid_at` datetime NOT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `debt_payments_user_id_paid_at_index` (`user_id`,`paid_at`),
  KEY `debt_payments_paid_at_index` (`paid_at`),
  KEY `debt_payments_debt_id_foreign` (`debt_id`),
  CONSTRAINT `debt_payments_debt_id_foreign` FOREIGN KEY (`debt_id`) REFERENCES `debts` (`id`),
  CONSTRAINT `debt_payments_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `chk_debt_payments_amount_positive` CHECK (`amount` > 0)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `debts`;
CREATE TABLE `debts` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned NOT NULL,
  `category_id` bigint(20) unsigned DEFAULT NULL,
  `amount` decimal(12,2) NOT NULL,
  `description` varchar(255) NOT NULL,
  `issue_date` datetime NOT NULL,
  `settle_date` datetime DEFAULT NULL,
  `is_forgiven` tinyint(1) NOT NULL DEFAULT 0,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `debts_user_id_foreign` (`user_id`),
  KEY `debts_category_id_foreign` (`category_id`),
  KEY `debts_issue_date_index` (`issue_date`),
  KEY `debts_settle_date_index` (`settle_date`),
  CONSTRAINT `debts_category_id_foreign` FOREIGN KEY (`category_id`) REFERENCES `debt_categories` (`id`) ON DELETE CASCADE,
  CONSTRAINT `debts_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `chk_debts_amount_positive` CHECK (`amount` > 0)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `failed_jobs`;
CREATE TABLE `failed_jobs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `uuid` varchar(255) NOT NULL,
  `connection` text NOT NULL,
  `queue` text NOT NULL,
  `payload` longtext NOT NULL,
  `exception` longtext NOT NULL,
  `failed_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `failed_jobs_uuid_unique` (`uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `income_entries`;
CREATE TABLE `income_entries` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned NOT NULL,
  `type` varchar(32) NOT NULL,
  `name` varchar(64) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `received_at` date NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `purchase_id` bigint(20) unsigned DEFAULT NULL,
  `regular_schedule_id` bigint(20) unsigned DEFAULT NULL,
  `regular_schedule_version_id` bigint(20) unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `income_entries_version_received_unique` (`regular_schedule_version_id`,`received_at`),
  KEY `income_entries_purchase_id_foreign` (`purchase_id`),
  KEY `income_entries_regular_schedule_id_foreign` (`regular_schedule_id`),
  KEY `income_entries_received_at_index` (`received_at`),
  KEY `income_entries_user_id_received_at_index` (`user_id`,`received_at`),
  CONSTRAINT `income_entries_purchase_id_foreign` FOREIGN KEY (`purchase_id`) REFERENCES `purchases` (`id`) ON DELETE SET NULL,
  CONSTRAINT `income_entries_regular_schedule_id_foreign` FOREIGN KEY (`regular_schedule_id`) REFERENCES `regular_income_schedules` (`id`) ON DELETE SET NULL,
  CONSTRAINT `income_entries_regular_schedule_version_id_foreign` FOREIGN KEY (`regular_schedule_version_id`) REFERENCES `regular_income_schedule_versions` (`id`) ON DELETE SET NULL,
  CONSTRAINT `income_entries_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `chk_income_entries_amount_positive` CHECK (`amount` > 0),
  CONSTRAINT `chk_income_entries_type` CHECK (`type` in ('regular','irregular','refund'))
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `job_batches`;
CREATE TABLE `job_batches` (
  `id` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `total_jobs` int(11) NOT NULL,
  `pending_jobs` int(11) NOT NULL,
  `failed_jobs` int(11) NOT NULL,
  `failed_job_ids` longtext NOT NULL,
  `options` mediumtext DEFAULT NULL,
  `cancelled_at` int(11) DEFAULT NULL,
  `created_at` int(11) NOT NULL,
  `finished_at` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `jobs`;
CREATE TABLE `jobs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `queue` varchar(255) NOT NULL,
  `payload` longtext NOT NULL,
  `attempts` tinyint(3) unsigned NOT NULL,
  `reserved_at` int(10) unsigned DEFAULT NULL,
  `available_at` int(10) unsigned NOT NULL,
  `created_at` int(10) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `jobs_queue_index` (`queue`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `migrations`;
CREATE TABLE `migrations` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `migration` varchar(255) NOT NULL,
  `batch` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=50 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `password_reset_tokens`;
CREATE TABLE `password_reset_tokens` (
  `email` varchar(255) NOT NULL,
  `token` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `personal_access_tokens`;
CREATE TABLE `personal_access_tokens` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `tokenable_type` varchar(255) NOT NULL,
  `tokenable_id` bigint(20) unsigned NOT NULL,
  `name` text NOT NULL,
  `token` varchar(64) NOT NULL,
  `abilities` text DEFAULT NULL,
  `last_used_at` timestamp NULL DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `personal_access_tokens_token_unique` (`token`),
  KEY `personal_access_tokens_tokenable_type_tokenable_id_index` (`tokenable_type`,`tokenable_id`),
  KEY `personal_access_tokens_expires_at_index` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `purchase_categories`;
CREATE TABLE `purchase_categories` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned NOT NULL,
  `name` varchar(64) NOT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `purchase_categories_user_id_category_name_unique` (`user_id`,`name`),
  CONSTRAINT `purchase_categories_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `purchases`;
CREATE TABLE `purchases` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned NOT NULL,
  `category_id` bigint(20) unsigned NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `description` varchar(255) NOT NULL,
  `date` datetime NOT NULL,
  `attachment_path` varchar(255) DEFAULT NULL,
  `url` text DEFAULT NULL,
  `is_refunded` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `purchases_category_id_foreign` (`category_id`),
  KEY `purchases_date_index` (`date`),
  KEY `purchases_user_id_date_index` (`user_id`,`date`),
  CONSTRAINT `purchases_category_id_foreign` FOREIGN KEY (`category_id`) REFERENCES `purchase_categories` (`id`) ON DELETE CASCADE,
  CONSTRAINT `purchases_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `chk_purchases_amount_positive` CHECK (`amount` > 0)
) ENGINE=InnoDB AUTO_INCREMENT=26 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `recurring_charges`;
CREATE TABLE `recurring_charges` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned NOT NULL,
  `recurring_payment_entry_id` bigint(20) unsigned NOT NULL,
  `recurring_payment_stream_id` bigint(20) unsigned NOT NULL,
  `recurring_payment_category_id` bigint(20) unsigned DEFAULT NULL,
  `stream_name` varchar(64) NOT NULL,
  `category_name` varchar(64) DEFAULT NULL,
  `amount` decimal(12,2) NOT NULL,
  `occurred_on` date NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `recurring_charges_entry_date_unique` (`recurring_payment_entry_id`,`occurred_on`),
  KEY `recurring_charges_recurring_payment_stream_id_foreign` (`recurring_payment_stream_id`),
  KEY `recurring_charges_recurring_payment_category_id_foreign` (`recurring_payment_category_id`),
  KEY `recurring_charges_user_id_occurred_on_index` (`user_id`,`occurred_on`),
  KEY `recurring_charges_occurred_on_index` (`occurred_on`),
  CONSTRAINT `recurring_charges_recurring_payment_category_id_foreign` FOREIGN KEY (`recurring_payment_category_id`) REFERENCES `recurring_payment_categories` (`id`) ON DELETE SET NULL,
  CONSTRAINT `recurring_charges_recurring_payment_entry_id_foreign` FOREIGN KEY (`recurring_payment_entry_id`) REFERENCES `recurring_payment_entries` (`id`),
  CONSTRAINT `recurring_charges_recurring_payment_stream_id_foreign` FOREIGN KEY (`recurring_payment_stream_id`) REFERENCES `recurring_payment_streams` (`id`),
  CONSTRAINT `recurring_charges_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `chk_recurring_charges_amount_positive` CHECK (`amount` > 0)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `recurring_occurrence_skips`;
CREATE TABLE `recurring_occurrence_skips` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned NOT NULL,
  `recurring_payment_entry_id` bigint(20) unsigned NOT NULL,
  `occurrence_date` date NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `recurring_occurrence_skips_entry_date_unique` (`recurring_payment_entry_id`,`occurrence_date`),
  KEY `recurring_occurrence_skips_user_id_foreign` (`user_id`),
  CONSTRAINT `recurring_occurrence_skips_recurring_payment_entry_id_foreign` FOREIGN KEY (`recurring_payment_entry_id`) REFERENCES `recurring_payment_entries` (`id`) ON DELETE CASCADE,
  CONSTRAINT `recurring_occurrence_skips_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `recurring_payment_categories`;
CREATE TABLE `recurring_payment_categories` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned NOT NULL,
  `name` varchar(64) NOT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `recurring_payment_categories_user_id_name_unique` (`user_id`,`name`),
  CONSTRAINT `recurring_payment_categories_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `recurring_payment_entries`;
CREATE TABLE `recurring_payment_entries` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned NOT NULL,
  `recurring_payment_stream_id` bigint(20) unsigned NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `frequency` enum('weekly','monthly','yearly') NOT NULL,
  `day_of_month` tinyint(3) unsigned DEFAULT NULL,
  `day_of_week` tinyint(3) unsigned DEFAULT NULL,
  `start_date` date NOT NULL,
  `end_date` date DEFAULT NULL,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `recurring_payment_entries_recurring_payment_stream_id_foreign` (`recurring_payment_stream_id`),
  KEY `recurring_payment_entries_user_id_active_index` (`user_id`,`active`),
  KEY `recurring_payment_entries_frequency_index` (`frequency`),
  CONSTRAINT `recurring_payment_entries_recurring_payment_stream_id_foreign` FOREIGN KEY (`recurring_payment_stream_id`) REFERENCES `recurring_payment_streams` (`id`) ON DELETE CASCADE,
  CONSTRAINT `recurring_payment_entries_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `chk_rpe_day_fields` CHECK (`frequency` = 'weekly' and `day_of_week` is not null or `frequency` in ('monthly','yearly') and `day_of_month` is not null),
  CONSTRAINT `chk_rpe_amount_positive` CHECK (`amount` > 0)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `recurring_payment_streams`;
CREATE TABLE `recurring_payment_streams` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned NOT NULL,
  `recurring_payment_category_id` bigint(20) unsigned DEFAULT NULL,
  `name` varchar(64) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `pending_active` tinyint(1) DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `recurring_payment_streams_recurring_payment_category_id_foreign` (`recurring_payment_category_id`),
  KEY `recurring_payment_streams_user_id_index` (`user_id`),
  CONSTRAINT `recurring_payment_streams_recurring_payment_category_id_foreign` FOREIGN KEY (`recurring_payment_category_id`) REFERENCES `recurring_payment_categories` (`id`) ON DELETE SET NULL,
  CONSTRAINT `recurring_payment_streams_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `regular_income_schedule_versions`;
CREATE TABLE `regular_income_schedule_versions` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned NOT NULL,
  `regular_schedule_id` bigint(20) unsigned NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `frequency` varchar(32) NOT NULL,
  `day_of_month` tinyint(3) unsigned DEFAULT NULL,
  `day_of_week` tinyint(3) unsigned DEFAULT NULL,
  `anchor_date` date DEFAULT NULL,
  `start_date` date NOT NULL,
  `end_date` date DEFAULT NULL,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `risv_schedule_active_idx` (`regular_schedule_id`,`active`),
  KEY `risv_user_active_idx` (`user_id`,`active`),
  CONSTRAINT `regular_income_schedule_versions_regular_schedule_id_foreign` FOREIGN KEY (`regular_schedule_id`) REFERENCES `regular_income_schedules` (`id`) ON DELETE CASCADE,
  CONSTRAINT `regular_income_schedule_versions_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `chk_risv_amount_positive` CHECK (`amount` > 0)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `regular_income_schedules`;
CREATE TABLE `regular_income_schedules` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned NOT NULL,
  `name` varchar(64) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `pending_active` tinyint(1) DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `regular_income_schedules_user_id_active_index` (`user_id`,`active`),
  CONSTRAINT `regular_income_schedules_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `savings`;
CREATE TABLE `savings` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `type` enum('deposit','withdrawal') NOT NULL DEFAULT 'deposit',
  `notes` varchar(500) DEFAULT NULL,
  `month` date NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `savings_user_id_foreign` (`user_id`),
  KEY `savings_month_index` (`month`),
  CONSTRAINT `savings_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `chk_savings_amount_positive` CHECK (`amount` > 0),
  CONSTRAINT `chk_savings_type` CHECK (`type` in ('deposit','withdrawal'))
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `sessions`;
CREATE TABLE `sessions` (
  `id` varchar(255) NOT NULL,
  `user_id` bigint(20) unsigned DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `payload` longtext NOT NULL,
  `last_activity` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `sessions_user_id_index` (`user_id`),
  KEY `sessions_last_activity_index` (`last_activity`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `first_name` varchar(255) NOT NULL,
  `last_name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `email_verified_at` timestamp NULL DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `remember_token` varchar(100) DEFAULT NULL,
  `currency` enum('EUR','USD') NOT NULL,
  `locale` varchar(16) DEFAULT NULL,
  `last_finance_processed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_unique` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (1, '0001_01_01_000000_create_users_table', 1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (2, '0001_01_01_000001_create_cache_table', 1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (3, '0001_01_01_000002_create_jobs_table', 1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (4, '2025_10_03_182236_create_balance_sheet_totals_table', 1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (5, '2025_10_03_182237_create_purchase_categories_table', 1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (6, '2025_10_03_182238_create_income_categories_table', 1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (7, '2025_10_03_182239_create_debt_categories_table', 1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (8, '2025_10_03_182240_create_income_streams_table', 1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (9, '2025_10_03_182241_create_income_entries_table', 1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (10, '2025_10_03_182242_create_purchases_table', 1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (11, '2025_10_03_182243_create_debts_table', 1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (12, '2025_10_03_182244_create_savings_table', 1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (13, '2026_04_16_000001_create_debt_payments_table', 1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (14, '2026_04_16_000002_create_recurring_purchases_table', 1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (15, '2026_04_16_000003_add_recurring_purchase_id_to_purchases_table', 1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (16, '2026_04_16_100957_add_unique_index_to_balance_sheet_totals', 1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (17, '2026_04_16_103148_drop_remaining_balance_from_debts', 1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (18, '2026_04_16_103159_add_check_constraint_to_recurring_purchases', 1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (19, '2026_04_16_105702_add_positive_amount_constraints_to_financial_tables', 1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (20, '2026_04_16_111744_make_category_id_nullable_on_financial_tables', 1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (21, '2026_04_16_120001_add_is_refunded_to_purchases_table', 1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (22, '2026_04_16_120002_add_purchase_id_to_income_entries_table', 1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (23, '2026_04_16_120003_add_is_forgiven_to_debts_table', 1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (24, '2026_04_16_120004_add_soft_deletes_to_category_tables', 1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (25, '2026_04_16_120005_add_is_system_soft_deletes_to_income_streams', 1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (26, '2026_04_16_120006_make_purchases_category_id_not_nullable', 1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (27, '2026_04_16_120007_create_recurring_payment_categories_table', 1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (28, '2026_04_16_120008_create_recurring_payment_streams_table', 1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (29, '2026_04_16_120009_create_recurring_payment_entries_table', 1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (30, '2026_04_16_120010_replace_recurring_purchases_with_payment_entries', 1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (31, '2026_04_16_211113_create_personal_access_tokens_table', 1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (32, '2026_04_16_215116_add_total_recurring_to_balance_sheet_totals_table', 1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (33, '2026_05_02_171900_add_type_and_notes_to_savings_table', 1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (34, '2026_06_10_181617_add_active_to_recurring_payment_streams_table', 1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (35, '2026_06_10_192038_add_pending_active_to_recurring_payment_streams_table', 1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (36, '2026_06_11_100001_create_regular_income_schedules_table', 1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (37, '2026_06_11_100002_create_regular_income_schedule_versions_table', 1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (38, '2026_06_11_100003_redesign_income_entries_table', 1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (39, '2026_06_11_100004_drop_legacy_income_streams_and_categories', 1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (40, '2026_07_30_202813_add_last_finance_processed_at_to_users_table', 2);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (41, '2026_07_30_223039_create_recurring_occurrence_skips_table', 2);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (42, '2026_08_06_221042_add_soft_deletes_to_debts_table', 3);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (43, '2026_08_06_221044_change_debt_payments_fk_to_restrict', 3);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (44, '2026_08_06_221046_create_recurring_charges_table', 4);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (45, '2026_08_06_221811_standardize_purchase_and_debt_category_columns', 5);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (46, '2026_08_17_230000_tighten_income_entries_required_columns', 6);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (47, '2026_08_17_231500_add_wave5_mysql_checks', 6);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (48, '2026_08_18_190000_add_locale_to_users_table', 7);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (49, '2026_08_18_190100_add_composite_user_date_indexes', 7);

SET FOREIGN_KEY_CHECKS=1;
