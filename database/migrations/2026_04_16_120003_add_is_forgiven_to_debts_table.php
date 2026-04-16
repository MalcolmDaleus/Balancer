<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Adds the is_forgiven flag to debts.
 *
 * A forgiven debt has had its outstanding balance written off by the creditor.
 * is_forgiven can only be set to true when remaining_balance > 0 at that moment.
 * A fully paid debt (remaining_balance = 0) is "settled", never "forgiven".
 * When forgiven, settle_date is also set by the application to record the event date.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('debts', function (Blueprint $table) {
            $table->boolean('is_forgiven')->default(false)->after('settle_date');
        });
    }

    public function down(): void
    {
        Schema::table('debts', function (Blueprint $table) {
            $table->dropColumn('is_forgiven');
        });
    }
};
