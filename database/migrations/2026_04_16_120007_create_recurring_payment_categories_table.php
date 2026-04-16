<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Dedicated category table for recurring payment streams.
 *
 * Kept separate from purchase_categories because recurring commitments
 * (subscriptions, rent, utilities, etc.) have a distinct semantic context
 * from one-off purchases and warrant their own taxonomy.
 *
 * Soft deletes allow categories to be retired from pickers while preserving
 * the historical link from any streams that used them.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('recurring_payment_categories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name', 64);
            $table->softDeletes();
            $table->timestamps();

            $table->unique(['user_id', 'name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('recurring_payment_categories');
    }
};
