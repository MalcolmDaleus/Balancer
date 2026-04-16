<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('recurring_purchases', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('category_id')->constrained('purchase_categories')->cascadeOnDelete();
            $table->decimal('amount', 12, 2);
            $table->string('description', 255);
            $table->enum('frequency', ['weekly', 'monthly', 'yearly']);
            // For monthly/yearly: which day of the month (1–31). Values > month length clamp to last day.
            $table->unsignedTinyInteger('day_of_month')->nullable();
            // For weekly: which day of the week (0 = Sunday … 6 = Saturday, matching Carbon).
            $table->unsignedTinyInteger('day_of_week')->nullable();
            $table->date('start_date');
            $table->date('end_date')->nullable();
            $table->boolean('active')->default(true);
            $table->timestamps();

            $table->index(['user_id', 'active']);
            $table->index('frequency');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('recurring_purchases');
    }
};
