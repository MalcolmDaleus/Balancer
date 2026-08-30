# Migrations (Wave 5 C7 squash)

Historical PHP migrations live in `archived/wave5-pass5-migrations/`.

Greenfield / `migrate:fresh` / Pest (`sqlite :memory:`) load the final schema from:

- `database/schema/sqlite-schema.sql`
- `database/schema/mysql-schema.sql`

New tables after the squash are ordinary PHP files in this folder (they run after the dump). Do **not** delete the schema files.

Regenerate dumps (optional):
1. Restore archived migrations into this folder temporarily, migrate a clean DB
2. `php database/_dump_sqlite_schema.php` / `php database/_dump_mysql_schema.php`
3. Re-prune this folder
