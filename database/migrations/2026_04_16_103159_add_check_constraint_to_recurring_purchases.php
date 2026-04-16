<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Add a MySQL CHECK constraint enforcing consistency between `frequency`
 * and the two day-selector columns on `recurring_purchases`.
 *
 * Rules:
 *   - frequency = 'weekly'             → day_of_week  must be NOT NULL
 *   - frequency = 'monthly' | 'yearly' → day_of_month must be NOT NULL
 *
 * Both columns remain nullable at the column level (they are mutually
 * exclusive per frequency), but the constraint prevents invalid combinations
 * from ever reaching the database.
 *
 * Requires MySQL 8.0.16+ (CHECK constraints are enforced from that version).
 */
return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() !== 'mysql') {
            return;
        }

        DB::statement("
            ALTER TABLE recurring_purchases
            ADD CONSTRAINT chk_rp_day_fields CHECK (
                (frequency = 'weekly'  AND day_of_week  IS NOT NULL) OR
                (frequency IN ('monthly', 'yearly') AND day_of_month IS NOT NULL)
            )
        ");
    }

    public function down(): void
    {
        if (DB::getDriverName() !== 'mysql') {
            return;
        }

        DB::statement('ALTER TABLE recurring_purchases DROP CHECK chk_rp_day_fields');
    }
};
