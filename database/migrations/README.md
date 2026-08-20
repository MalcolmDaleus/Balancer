# Migrations (Wave 5 C7 squash)

Historical PHP migrations live in `archived/wave5-pass5-migrations/`.

Greenfield / `migrate:fresh` / Pest (`sqlite :memory:`) load the final schema from:

- `database/schema/sqlite-schema.sql`
- `database/schema/mysql-schema.sql`

Do **not** delete those schema files. Existing databases that already ran the historical chain keep working — their `migrations` table rows still match the archived filenames.

Regenerate dumps (optional):
1. Restore archived migrations into this folder temporarily, migrate a clean DB
2. `php database/_dump_sqlite_schema.php` / `php database/_dump_mysql_schema.php`
3. Re-prune this folder
