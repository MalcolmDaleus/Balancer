<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

/**
 * Versioned price/schedule entries for each recurring payment stream.
 *
 * When a subscription price changes, the current entry's end_date is set and a new
 * entry is created with the updated amount — preserving a full price history per stream.
 * Yearly subscriptions are recorded at their full amount in the month they are charged;
 * they are NOT amortized across months.
 *
 * active = false indicates the entry has been superseded (end_date set) or manually retired.
 * Soft deletes (deleted_at) allow full removal from ORM queries for erroneously created entries.
 *
 * The MySQL CHECK constraint enforces consistency between frequency and the day selectors,
 * matching the same rule that existed on the legacy recurring_purchases table.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('recurring_payment_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('recurring_payment_stream_id')
                ->constrained('recurring_payment_streams')
                ->cascadeOnDelete();
            $table->decimal('amount', 12, 2);
            $table->enum('frequency', ['weekly', 'monthly', 'yearly']);
            // For monthly/yearly: which day of the month (1–31). Values > month length clamp to last day.
            $table->unsignedTinyInteger('day_of_month')->nullable();
            // For weekly: which day of the week (0 = Sunday … 6 = Saturday, matching Carbon).
            $table->unsignedTinyInteger('day_of_week')->nullable();
            $table->date('start_date');
            $table->date('end_date')->nullable();
            $table->boolean('active')->default(true);
            $table->softDeletes();
            $table->timestamps();

            $table->index(['user_id', 'active']);
            $table->index('frequency');
        });

        if (DB::getDriverName() === 'mysql') {
            DB::statement("
                ALTER TABLE recurring_payment_entries
                ADD CONSTRAINT chk_rpe_day_fields CHECK (
                    (frequency = 'weekly'  AND day_of_week  IS NOT NULL) OR
                    (frequency IN ('monthly', 'yearly') AND day_of_month IS NOT NULL)
                )
            ");

            DB::statement("
                ALTER TABLE recurring_payment_entries
                ADD CONSTRAINT chk_rpe_amount_positive CHECK (amount > 0)
            ");
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('recurring_payment_entries');
    }
};
