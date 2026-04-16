<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Drop the legacy `remaining_balance` column from the `debts` table.
 *
 * The column was originally written by the application to track remaining
 * debt balance, but it is no longer authoritative. The computed value is
 * now derived on-the-fly from debt_payments via Debt::getRemainingBalanceAttribute().
 *
 * The `down()` migration restores the column as NOT NULL with default 0 so
 * a rollback leaves a valid (though unpopulated) schema.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('debts', function (Blueprint $table) {
            $table->dropColumn('remaining_balance');
        });
    }

    public function down(): void
    {
        Schema::table('debts', function (Blueprint $table) {
            $table->decimal('remaining_balance', 12, 2)->default(0)->after('settle_date');
        });
    }
};
