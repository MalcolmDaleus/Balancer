<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Wave 5.A6 — remaining MySQL CHECKs + drop stale recurring_purchases constraint.
 *
 * - recurring_charges.amount > 0
 * - savings.type IN ('deposit', 'withdrawal')  (belt alongside MySQL ENUM)
 * - drop chk_recurring_purchases_amount_positive if still present
 *
 * Enum / CHECK pairing: when changing allowed values in PHP enums, update the
 * matching MySQL CHECK (and ENUM column if any) in the same release. See master
 * doc §5 Schema Integrity Notes.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() !== 'mysql') {
            return;
        }

        // Normalize any junk before CHECK (SQLite/dev leftovers shouldn't exist on MySQL,
        // but keep this safe for mixed environments).
        if (Schema::hasTable('savings')) {
            DB::table('savings')
                ->where(function ($q) {
                    $q->whereNull('type')
                        ->orWhereNotIn('type', ['deposit', 'withdrawal']);
                })
                ->update(['type' => 'deposit']);
        }

        if (Schema::hasTable('recurring_charges')) {
            $this->addCheckIfMissing(
                'recurring_charges',
                'chk_recurring_charges_amount_positive',
                '`amount` > 0'
            );
        }

        if (Schema::hasTable('savings')) {
            $this->addCheckIfMissing(
                'savings',
                'chk_savings_type',
                "`type` IN ('deposit', 'withdrawal')"
            );
        }

        $this->dropCheckIfPresent('recurring_purchases', 'chk_recurring_purchases_amount_positive');
    }

    public function down(): void
    {
        if (DB::getDriverName() !== 'mysql') {
            return;
        }

        $this->dropCheckIfPresent('recurring_charges', 'chk_recurring_charges_amount_positive');
        $this->dropCheckIfPresent('savings', 'chk_savings_type');

        // Do not recreate the legacy recurring_purchases constraint on down.
    }

    private function addCheckIfMissing(string $table, string $name, string $expression): void
    {
        if ($this->checkExists($table, $name)) {
            return;
        }

        DB::statement("ALTER TABLE `{$table}` ADD CONSTRAINT `{$name}` CHECK ({$expression})");
    }

    private function dropCheckIfPresent(string $table, string $name): void
    {
        if (! Schema::hasTable($table) || ! $this->checkExists($table, $name)) {
            return;
        }

        DB::statement("ALTER TABLE `{$table}` DROP CHECK `{$name}`");
    }

    private function checkExists(string $table, string $name): bool
    {
        $row = DB::selectOne(
            'SELECT CONSTRAINT_NAME
             FROM information_schema.TABLE_CONSTRAINTS
             WHERE CONSTRAINT_SCHEMA = DATABASE()
               AND TABLE_NAME = ?
               AND CONSTRAINT_NAME = ?
               AND CONSTRAINT_TYPE = ?',
            [$table, $name, 'CHECK']
        );

        return $row !== null;
    }
};
