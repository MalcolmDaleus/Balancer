<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('budget_plans', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->date('month');
            $table->bigInteger('discretionary_cents');
            $table->bigInteger('bills_cents')->nullable();
            $table->bigInteger('debt_payment_cents')->nullable();
            $table->bigInteger('save_cents')->nullable();
            $table->date('copied_from_month')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'month']);
        });

        Schema::create('budget_envelopes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('budget_plan_id')->constrained('budget_plans')->cascadeOnDelete();
            $table->string('domain', 16);
            $table->unsignedBigInteger('category_id');
            $table->bigInteger('amount_cents');
            $table->timestamps();

            $table->unique(['budget_plan_id', 'domain', 'category_id']);
            $table->index(['user_id', 'domain', 'category_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('budget_envelopes');
        Schema::dropIfExists('budget_plans');
    }
};
