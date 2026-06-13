<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Add stream-level active flag to recurring_payment_streams.
 *
 * This separates two independent concerns:
 *   - stream.active  = "is this subscription currently running?" (pause/resume)
 *   - stream.deleted_at = "is this subscription archived?" (soft-delete / retire)
 *
 * The balance sheet queries recurring entries only for streams where active = true.
 * Pausing (active = false) excludes the stream from the balance sheet without
 * touching the versioned price-entry history. Archiving (deleted_at) moves it
 * to the archive tab without hard-deleting historical data.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('recurring_payment_streams', function (Blueprint $table) {
            $table->boolean('active')->default(true)->after('description');
        });
    }

    public function down(): void
    {
        Schema::table('recurring_payment_streams', function (Blueprint $table) {
            $table->dropColumn('active');
        });
    }
};
