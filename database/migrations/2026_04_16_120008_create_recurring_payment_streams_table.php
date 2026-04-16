<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Represents a persistent recurring payment definition (analogous to income_streams).
 *
 * Each stream is the identity of a recurring commitment — e.g. "Netflix subscription"
 * or "Rent".  The actual amounts and schedules over time are stored as versioned entries
 * in recurring_payment_entries.  When a price changes, a new entry is created for that
 * stream; the old entry gets an end_date.  The stream itself is never deleted once in use.
 *
 * Soft deletes allow a stream to be retired from the UI without orphaning historical
 * purchase records that were linked to its entries.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('recurring_payment_streams', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('recurring_payment_category_id')
                ->nullable()
                ->constrained('recurring_payment_categories')
                ->nullOnDelete();
            $table->string('name', 64);
            $table->string('description', 255)->nullable();
            $table->softDeletes();
            $table->timestamps();

            $table->index(['user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('recurring_payment_streams');
    }
};
