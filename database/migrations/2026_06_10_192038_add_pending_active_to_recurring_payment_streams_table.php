<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Add pending_active to recurring_payment_streams.
 *
 * NULL   = no state change queued (normal)
 * TRUE   = resume queued for next charge occurrence
 * FALSE  = pause queued for next charge occurrence
 *
 * RecurringPaymentCycleService flushes this into the live `active` column
 * on the stream's next charge date and resets pending_active to NULL.
 * The toggle is reversible until then — clicking again cancels the queue.
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
