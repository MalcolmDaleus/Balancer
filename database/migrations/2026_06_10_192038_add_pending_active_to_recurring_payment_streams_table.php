<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Add pending_active to recurring_payment_streams.
 *
 * NULL   = no state change queued (normal)
 * TRUE   = resume queued for next month boundary
 * FALSE  = pause queued for next month boundary
 *
 * When AutoMonthCloseService closes a month it flushes this column into
 * the live `active` column and resets pending_active back to NULL.
 * This makes the toggle reversible within the same month — clicking the
 * toggle again before month close simply resets pending_active to NULL.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('recurring_payment_streams', function (Blueprint $table) {
            $table->boolean('pending_active')->nullable()->default(null)->after('active');
        });
    }

    public function down(): void
    {
        Schema::table('recurring_payment_streams', function (Blueprint $table) {
            $table->dropColumn('pending_active');
        });
    }
};
