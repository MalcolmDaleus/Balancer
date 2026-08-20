-- Balancer Wave 5 C7 squash — SQLite final schema (generated)
-- Loaded by migrate when migrations table is empty (tests / migrate:fresh).
PRAGMA foreign_keys = OFF;
BEGIN;

CREATE TABLE "balance_sheet_totals" ("id" integer primary key autoincrement not null, "user_id" integer not null, "month" date not null, "total_income" numeric not null default '0', "total_debt_paid" numeric not null default '0', "total_spending" numeric not null default '0', "savings_snapshot" numeric not null default '0', "roll_over" numeric not null default '0', "created_at" datetime, "updated_at" datetime, "total_recurring" numeric not null default '0', foreign key("user_id") references "users"("id") on delete cascade);

CREATE TABLE "cache" ("key" varchar not null, "value" text not null, "expiration" integer not null, primary key ("key"));

CREATE TABLE "cache_locks" ("key" varchar not null, "owner" varchar not null, "expiration" integer not null, primary key ("key"));

CREATE TABLE "debt_categories" ("id" integer primary key autoincrement not null, "user_id" integer not null, "name" varchar not null, "deleted_at" datetime, "created_at" datetime, "updated_at" datetime, foreign key("user_id") references "users"("id") on delete cascade);

CREATE TABLE "debt_payments" ("id" integer primary key autoincrement not null, "user_id" integer not null, "debt_id" integer not null, "amount" numeric not null, "paid_at" datetime not null, "notes" text, "created_at" datetime, "updated_at" datetime, foreign key("user_id") references users("id") on delete cascade on update no action, foreign key("debt_id") references "debts"("id") on delete restrict);

CREATE TABLE "debts" ("id" integer primary key autoincrement not null, "user_id" integer not null, "category_id" integer, "amount" numeric not null, "description" varchar not null, "issue_date" datetime not null, "settle_date" datetime, "notes" text, "created_at" datetime, "updated_at" datetime, "is_forgiven" tinyint(1) not null default '0', "deleted_at" datetime, foreign key("category_id") references debt_categories("id") on delete cascade on update no action, foreign key("user_id") references users("id") on delete cascade on update no action);

CREATE TABLE "failed_jobs" ("id" integer primary key autoincrement not null, "uuid" varchar not null, "connection" text not null, "queue" text not null, "payload" text not null, "exception" text not null, "failed_at" datetime not null default CURRENT_TIMESTAMP);

CREATE TABLE "income_entries" ("id" integer primary key autoincrement not null, "user_id" integer not null, "amount" numeric not null, "created_at" datetime, "updated_at" datetime, "purchase_id" integer, "type" varchar not null, "name" varchar not null, "description" varchar, "received_at" date not null, "regular_schedule_id" integer, "regular_schedule_version_id" integer, foreign key("purchase_id") references purchases("id") on delete set null on update no action, foreign key("user_id") references users("id") on delete cascade on update no action, foreign key("regular_schedule_id") references regular_income_schedules("id") on delete set null on update no action, foreign key("regular_schedule_version_id") references regular_income_schedule_versions("id") on delete set null on update no action);

CREATE TABLE "job_batches" ("id" varchar not null, "name" varchar not null, "total_jobs" integer not null, "pending_jobs" integer not null, "failed_jobs" integer not null, "failed_job_ids" text not null, "options" text, "cancelled_at" integer, "created_at" integer not null, "finished_at" integer, primary key ("id"));

CREATE TABLE "jobs" ("id" integer primary key autoincrement not null, "queue" varchar not null, "payload" text not null, "attempts" integer not null, "reserved_at" integer, "available_at" integer not null, "created_at" integer not null);

CREATE TABLE "migrations" ("id" integer primary key autoincrement not null, "migration" varchar not null, "batch" integer not null);

CREATE TABLE "password_reset_tokens" ("email" varchar not null, "token" varchar not null, "created_at" datetime, primary key ("email"));

CREATE TABLE "personal_access_tokens" ("id" integer primary key autoincrement not null, "tokenable_type" varchar not null, "tokenable_id" integer not null, "name" text not null, "token" varchar not null, "abilities" text, "last_used_at" datetime, "expires_at" datetime, "created_at" datetime, "updated_at" datetime);

CREATE TABLE "purchase_categories" ("id" integer primary key autoincrement not null, "user_id" integer not null, "name" varchar not null, "deleted_at" datetime, "created_at" datetime, "updated_at" datetime, foreign key("user_id") references "users"("id") on delete cascade);

CREATE TABLE "purchases" ("id" integer primary key autoincrement not null, "user_id" integer not null, "category_id" integer not null, "amount" numeric not null, "description" varchar not null, "date" datetime not null, "attachment_path" varchar, "url" text, "created_at" datetime, "updated_at" datetime, "is_refunded" tinyint(1) not null default ('0'), foreign key("user_id") references users("id") on delete cascade on update no action, foreign key("category_id") references purchase_categories("id") on delete cascade on update no action);

CREATE TABLE "recurring_charges" ("id" integer primary key autoincrement not null, "user_id" integer not null, "recurring_payment_entry_id" integer not null, "recurring_payment_stream_id" integer not null, "recurring_payment_category_id" integer, "stream_name" varchar not null, "category_name" varchar, "amount" numeric not null, "occurred_on" date not null, "created_at" datetime, "updated_at" datetime, foreign key("user_id") references "users"("id") on delete cascade, foreign key("recurring_payment_entry_id") references "recurring_payment_entries"("id") on delete restrict, foreign key("recurring_payment_stream_id") references "recurring_payment_streams"("id") on delete restrict, foreign key("recurring_payment_category_id") references "recurring_payment_categories"("id") on delete set null);

CREATE TABLE "recurring_occurrence_skips" ("id" integer primary key autoincrement not null, "user_id" integer not null, "recurring_payment_entry_id" integer not null, "occurrence_date" date not null, "created_at" datetime, "updated_at" datetime, foreign key("user_id") references "users"("id") on delete cascade, foreign key("recurring_payment_entry_id") references "recurring_payment_entries"("id") on delete cascade);

CREATE TABLE "recurring_payment_categories" ("id" integer primary key autoincrement not null, "user_id" integer not null, "name" varchar not null, "deleted_at" datetime, "created_at" datetime, "updated_at" datetime, foreign key("user_id") references "users"("id") on delete cascade);

CREATE TABLE "recurring_payment_entries" ("id" integer primary key autoincrement not null, "user_id" integer not null, "recurring_payment_stream_id" integer not null, "amount" numeric not null, "frequency" varchar check ("frequency" in ('weekly', 'monthly', 'yearly')) not null, "day_of_month" integer, "day_of_week" integer, "start_date" date not null, "end_date" date, "active" tinyint(1) not null default '1', "deleted_at" datetime, "created_at" datetime, "updated_at" datetime, foreign key("user_id") references "users"("id") on delete cascade, foreign key("recurring_payment_stream_id") references "recurring_payment_streams"("id") on delete cascade);

CREATE TABLE "recurring_payment_streams" ("id" integer primary key autoincrement not null, "user_id" integer not null, "recurring_payment_category_id" integer, "name" varchar not null, "description" varchar, "deleted_at" datetime, "created_at" datetime, "updated_at" datetime, "active" tinyint(1) not null default '1', "pending_active" tinyint(1), foreign key("user_id") references "users"("id") on delete cascade, foreign key("recurring_payment_category_id") references "recurring_payment_categories"("id") on delete set null);

CREATE TABLE "regular_income_schedule_versions" ("id" integer primary key autoincrement not null, "user_id" integer not null, "regular_schedule_id" integer not null, "amount" numeric not null, "frequency" varchar not null, "day_of_month" integer, "day_of_week" integer, "anchor_date" date, "start_date" date not null, "end_date" date, "active" tinyint(1) not null default '1', "created_at" datetime, "updated_at" datetime, foreign key("user_id") references "users"("id") on delete cascade, foreign key("regular_schedule_id") references "regular_income_schedules"("id") on delete cascade);

CREATE TABLE "regular_income_schedules" ("id" integer primary key autoincrement not null, "user_id" integer not null, "name" varchar not null, "description" varchar, "active" tinyint(1) not null default '1', "pending_active" tinyint(1), "deleted_at" datetime, "created_at" datetime, "updated_at" datetime, foreign key("user_id") references "users"("id") on delete cascade);

CREATE TABLE "savings" ("id" integer primary key autoincrement not null, "user_id" integer not null, "amount" numeric not null, "month" date not null, "created_at" datetime, "updated_at" datetime, "type" varchar check ("type" in ('deposit', 'withdrawal')) not null default 'deposit', "notes" varchar, foreign key("user_id") references "users"("id") on delete cascade);

CREATE TABLE "sessions" ("id" varchar not null, "user_id" integer, "ip_address" varchar, "user_agent" text, "payload" text not null, "last_activity" integer not null, primary key ("id"));

CREATE TABLE "users" ("id" integer primary key autoincrement not null, "first_name" varchar not null, "last_name" varchar not null, "email" varchar not null, "email_verified_at" datetime, "password" varchar not null, "remember_token" varchar, "currency" varchar check ("currency" in ('EUR', 'USD')) not null, "created_at" datetime, "updated_at" datetime, "last_finance_processed_at" datetime, "locale" varchar);

CREATE INDEX "balance_sheet_totals_month_index" on "balance_sheet_totals" ("month");

CREATE UNIQUE INDEX "bst_user_month_unique" on "balance_sheet_totals" ("user_id", "month");

CREATE UNIQUE INDEX "debt_categories_user_id_category_name_unique" on "debt_categories" ("user_id", "name");

CREATE INDEX "debt_payments_paid_at_index" on "debt_payments" ("paid_at");

CREATE INDEX "debt_payments_user_id_paid_at_index" on "debt_payments" ("user_id", "paid_at");

CREATE INDEX "debts_issue_date_index" on "debts" ("issue_date");

CREATE INDEX "debts_settle_date_index" on "debts" ("settle_date");

CREATE UNIQUE INDEX "failed_jobs_uuid_unique" on "failed_jobs" ("uuid");

CREATE INDEX "income_entries_received_at_index" on "income_entries" ("received_at");

CREATE INDEX "income_entries_user_id_received_at_index" on "income_entries" ("user_id", "received_at");

CREATE UNIQUE INDEX "income_entries_version_received_unique" on "income_entries" ("regular_schedule_version_id", "received_at");

CREATE INDEX "jobs_queue_index" on "jobs" ("queue");

CREATE INDEX "personal_access_tokens_expires_at_index" on "personal_access_tokens" ("expires_at");

CREATE UNIQUE INDEX "personal_access_tokens_token_unique" on "personal_access_tokens" ("token");

CREATE INDEX "personal_access_tokens_tokenable_type_tokenable_id_index" on "personal_access_tokens" ("tokenable_type", "tokenable_id");

CREATE UNIQUE INDEX "purchase_categories_user_id_category_name_unique" on "purchase_categories" ("user_id", "name");

CREATE INDEX "purchases_date_index" on "purchases" ("date");

CREATE INDEX "purchases_user_id_date_index" on "purchases" ("user_id", "date");

CREATE UNIQUE INDEX "recurring_charges_entry_date_unique" on "recurring_charges" ("recurring_payment_entry_id", "occurred_on");

CREATE INDEX "recurring_charges_occurred_on_index" on "recurring_charges" ("occurred_on");

CREATE INDEX "recurring_charges_user_id_occurred_on_index" on "recurring_charges" ("user_id", "occurred_on");

CREATE UNIQUE INDEX "recurring_occurrence_skips_entry_date_unique" on "recurring_occurrence_skips" ("recurring_payment_entry_id", "occurrence_date");

CREATE UNIQUE INDEX "recurring_payment_categories_user_id_name_unique" on "recurring_payment_categories" ("user_id", "name");

CREATE INDEX "recurring_payment_entries_frequency_index" on "recurring_payment_entries" ("frequency");

CREATE INDEX "recurring_payment_entries_user_id_active_index" on "recurring_payment_entries" ("user_id", "active");

CREATE INDEX "recurring_payment_streams_user_id_index" on "recurring_payment_streams" ("user_id");

CREATE INDEX "regular_income_schedules_user_id_active_index" on "regular_income_schedules" ("user_id", "active");

CREATE INDEX "risv_schedule_active_idx" on "regular_income_schedule_versions" ("regular_schedule_id", "active");

CREATE INDEX "risv_user_active_idx" on "regular_income_schedule_versions" ("user_id", "active");

CREATE INDEX "savings_month_index" on "savings" ("month");

CREATE INDEX "sessions_last_activity_index" on "sessions" ("last_activity");

CREATE INDEX "sessions_user_id_index" on "sessions" ("user_id");

CREATE UNIQUE INDEX "users_email_unique" on "users" ("email");

INSERT INTO migrations (id, migration, batch) VALUES (1, '0001_01_01_000000_create_users_table', 1);
INSERT INTO migrations (id, migration, batch) VALUES (2, '0001_01_01_000001_create_cache_table', 1);
INSERT INTO migrations (id, migration, batch) VALUES (3, '0001_01_01_000002_create_jobs_table', 1);
INSERT INTO migrations (id, migration, batch) VALUES (4, '2025_10_03_182236_create_balance_sheet_totals_table', 1);
INSERT INTO migrations (id, migration, batch) VALUES (5, '2025_10_03_182237_create_purchase_categories_table', 1);
INSERT INTO migrations (id, migration, batch) VALUES (6, '2025_10_03_182238_create_income_categories_table', 1);
INSERT INTO migrations (id, migration, batch) VALUES (7, '2025_10_03_182239_create_debt_categories_table', 1);
INSERT INTO migrations (id, migration, batch) VALUES (8, '2025_10_03_182240_create_income_streams_table', 1);
INSERT INTO migrations (id, migration, batch) VALUES (9, '2025_10_03_182241_create_income_entries_table', 1);
INSERT INTO migrations (id, migration, batch) VALUES (10, '2025_10_03_182242_create_purchases_table', 1);
INSERT INTO migrations (id, migration, batch) VALUES (11, '2025_10_03_182243_create_debts_table', 1);
INSERT INTO migrations (id, migration, batch) VALUES (12, '2025_10_03_182244_create_savings_table', 1);
INSERT INTO migrations (id, migration, batch) VALUES (13, '2026_04_16_000001_create_debt_payments_table', 1);
INSERT INTO migrations (id, migration, batch) VALUES (14, '2026_04_16_000002_create_recurring_purchases_table', 1);
INSERT INTO migrations (id, migration, batch) VALUES (15, '2026_04_16_000003_add_recurring_purchase_id_to_purchases_table', 1);
INSERT INTO migrations (id, migration, batch) VALUES (16, '2026_04_16_100957_add_unique_index_to_balance_sheet_totals', 1);
INSERT INTO migrations (id, migration, batch) VALUES (17, '2026_04_16_103148_drop_remaining_balance_from_debts', 1);
INSERT INTO migrations (id, migration, batch) VALUES (18, '2026_04_16_103159_add_check_constraint_to_recurring_purchases', 1);
INSERT INTO migrations (id, migration, batch) VALUES (19, '2026_04_16_105702_add_positive_amount_constraints_to_financial_tables', 1);
INSERT INTO migrations (id, migration, batch) VALUES (20, '2026_04_16_111744_make_category_id_nullable_on_financial_tables', 1);
INSERT INTO migrations (id, migration, batch) VALUES (21, '2026_04_16_120001_add_is_refunded_to_purchases_table', 1);
INSERT INTO migrations (id, migration, batch) VALUES (22, '2026_04_16_120002_add_purchase_id_to_income_entries_table', 1);
INSERT INTO migrations (id, migration, batch) VALUES (23, '2026_04_16_120003_add_is_forgiven_to_debts_table', 1);
INSERT INTO migrations (id, migration, batch) VALUES (24, '2026_04_16_120004_add_soft_deletes_to_category_tables', 1);
INSERT INTO migrations (id, migration, batch) VALUES (25, '2026_04_16_120005_add_is_system_soft_deletes_to_income_streams', 1);
INSERT INTO migrations (id, migration, batch) VALUES (26, '2026_04_16_120006_make_purchases_category_id_not_nullable', 1);
INSERT INTO migrations (id, migration, batch) VALUES (27, '2026_04_16_120007_create_recurring_payment_categories_table', 1);
INSERT INTO migrations (id, migration, batch) VALUES (28, '2026_04_16_120008_create_recurring_payment_streams_table', 1);
INSERT INTO migrations (id, migration, batch) VALUES (29, '2026_04_16_120009_create_recurring_payment_entries_table', 1);
INSERT INTO migrations (id, migration, batch) VALUES (30, '2026_04_16_120010_replace_recurring_purchases_with_payment_entries', 1);
INSERT INTO migrations (id, migration, batch) VALUES (31, '2026_04_16_211113_create_personal_access_tokens_table', 1);
INSERT INTO migrations (id, migration, batch) VALUES (32, '2026_04_16_215116_add_total_recurring_to_balance_sheet_totals_table', 1);
INSERT INTO migrations (id, migration, batch) VALUES (33, '2026_05_02_171900_add_type_and_notes_to_savings_table', 1);
INSERT INTO migrations (id, migration, batch) VALUES (34, '2026_06_10_181617_add_active_to_recurring_payment_streams_table', 1);
INSERT INTO migrations (id, migration, batch) VALUES (35, '2026_06_10_192038_add_pending_active_to_recurring_payment_streams_table', 1);
INSERT INTO migrations (id, migration, batch) VALUES (36, '2026_06_11_100001_create_regular_income_schedules_table', 1);
INSERT INTO migrations (id, migration, batch) VALUES (37, '2026_06_11_100002_create_regular_income_schedule_versions_table', 1);
INSERT INTO migrations (id, migration, batch) VALUES (38, '2026_06_11_100003_redesign_income_entries_table', 1);
INSERT INTO migrations (id, migration, batch) VALUES (39, '2026_06_11_100004_drop_legacy_income_streams_and_categories', 1);
INSERT INTO migrations (id, migration, batch) VALUES (40, '2026_07_30_202813_add_last_finance_processed_at_to_users_table', 1);
INSERT INTO migrations (id, migration, batch) VALUES (41, '2026_07_30_223039_create_recurring_occurrence_skips_table', 1);
INSERT INTO migrations (id, migration, batch) VALUES (42, '2026_08_06_221042_add_soft_deletes_to_debts_table', 1);
INSERT INTO migrations (id, migration, batch) VALUES (43, '2026_08_06_221044_change_debt_payments_fk_to_restrict', 1);
INSERT INTO migrations (id, migration, batch) VALUES (44, '2026_08_06_221046_create_recurring_charges_table', 1);
INSERT INTO migrations (id, migration, batch) VALUES (45, '2026_08_06_221811_standardize_purchase_and_debt_category_columns', 1);
INSERT INTO migrations (id, migration, batch) VALUES (46, '2026_08_17_230000_tighten_income_entries_required_columns', 1);
INSERT INTO migrations (id, migration, batch) VALUES (47, '2026_08_17_231500_add_wave5_mysql_checks', 1);
INSERT INTO migrations (id, migration, batch) VALUES (48, '2026_08_18_190000_add_locale_to_users_table', 1);
INSERT INTO migrations (id, migration, batch) VALUES (49, '2026_08_18_190100_add_composite_user_date_indexes', 1);

COMMIT;
PRAGMA foreign_keys = ON;
