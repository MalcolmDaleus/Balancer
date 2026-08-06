<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('recurring_occurrence_skips', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('recurring_payment_entry_id')
                ->constrained('recurring_payment_entries')
                ->cascadeOnDelete();
            $table->date('occurrence_date');
            $table->timestamps();

            $table->unique(
                ['recurring_payment_entry_id', 'occurrence_date'],
                'recurring_occurrence_skips_entry_date_unique'
            );
        });

        // One materialized purchase per entry occurrence date.
        // Manual purchases keep recurring_payment_entry_id null (ignored by unique in practice via separate rows).
        Schema::table('purchases', function (Blueprint $table) {
            $table->unique(
                ['recurring_payment_entry_id', 'date'],
                'purchases_recurring_entry_date_unique'
            );
        });
    }

    public function down(): void
    {
        Schema::table('purchases', function (Blueprint $table) {
            $table->dropUnique('purchases_recurring_entry_date_unique');
        });

        Schema::dropIfExists('recurring_occurrence_skips');
    }
};
