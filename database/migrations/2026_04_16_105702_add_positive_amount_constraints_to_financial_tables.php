<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Add MySQL CHECK constraints ensuring all monetary amount columns
 * across financial tables are strictly positive (> 0).
 *
 * Applies to:
 *   purchases, income_entries, debts, debt_payments,
 *   savings, recurring_purchases
 *
 * No-ops silently on SQLite (test environment) since SQLite 3.25+
 * parses but does not enforce CHECK constraints the same way.
 * Guarded by driver check for clarity.
 */
return new class extends Migration
{
    private array $constraints = [
        'purchases'          => 'chk_purchases_amount_positive',
        'income_entries'     => 'chk_income_entries_amount_positive',
        'debts'              => 'chk_debts_amount_positive',
        'debt_payments'      => 'chk_debt_payments_amount_positive',
        'savings'            => 'chk_savings_amount_positive',
        'recurring_purchases'=> 'chk_recurring_purchases_amount_positive',
    ];

    public function up(): void
    {
        if (DB::getDriverName() !== 'mysql') {
            return;
        }

        foreach ($this->constraints as $table => $name) {
            DB::statement("ALTER TABLE `{$table}` ADD CONSTRAINT `{$name}` CHECK (`amount` > 0)");
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() !== 'mysql') {
            return;
        }

        foreach ($this->constraints as $table => $name) {
            DB::statement("ALTER TABLE `{$table}` DROP CHECK `{$name}`");
        }
    }
};
