<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Replaces the legacy recurring_purchases architecture with the new
 * recurring_payment_streams + recurring_payment_entries design.
 *
 * Steps:
 *   1. Drop the old FK column purchases.recurring_purchase_id
 *   2. Add the new FK column purchases.recurring_payment_entry_id
 *   3. Drop the now-unused recurring_purchases table
 *
 * The new FK uses nullOnDelete so historical purchase records survive
 * if a recurring_payment_entry is hard-deleted (a rare operation).
 */
return new class extends Migration
{
    public function up(): void
    {
        // 1. Drop the old FK + column linking purchases → recurring_purchases
        Schema::table('purchases', function (Blueprint $table) {
            $table->dropConstrainedForeignId('recurring_purchase_id');
        });

        // 2. Add the new FK linking purchases → recurring_payment_entries
        Schema::table('purchases', function (Blueprint $table) {
            $table->foreignId('recurring_payment_entry_id')
                ->nullable()
                ->constrained('recurring_payment_entries')
                ->nullOnDelete();
        });

        // 3. Drop the legacy table (check constraints and indexes drop automatically)
        Schema::dropIfExists('recurring_purchases');
    }

    public function down(): void
    {
        // Reverse: recreate the legacy table stub and restore old FK
        Schema::table('purchases', function (Blueprint $table) {
            $table->dropConstrainedForeignId('recurring_payment_entry_id');
        });

        // Recreate a minimal recurring_purchases table so the old FK can be restored
        if (! Schema::hasTable('recurring_purchases')) {
            Schema::create('recurring_purchases', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->foreignId('category_id')->nullable()->constrained('purchase_categories')->nullOnDelete();
                $table->decimal('amount', 12, 2);
                $table->string('description', 255);
                $table->enum('frequency', ['weekly', 'monthly', 'yearly']);
                $table->unsignedTinyInteger('day_of_month')->nullable();
                $table->unsignedTinyInteger('day_of_week')->nullable();
                $table->date('start_date');
                $table->date('end_date')->nullable();
                $table->boolean('active')->default(true);
                $table->timestamps();
            });
        }

        Schema::table('purchases', function (Blueprint $table) {
            $table->foreignId('recurring_purchase_id')
                ->nullable()
                ->constrained('recurring_purchases')
                ->nullOnDelete();
        });
    }
};
