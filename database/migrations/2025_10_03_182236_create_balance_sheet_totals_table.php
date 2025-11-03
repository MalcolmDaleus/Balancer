<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('balance_sheet_totals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->date('month')->index();
            $table->decimal('total_income', 12, 2)->default(0);
            $table->decimal('total_debt_paid', 12, 2)->default(0);
            $table->decimal('total_spending', 12, 2)->default(0);
            $table->decimal('savings_snapshot', 12, 2)->default(0);
            $table->decimal('roll_over', 12, 2)->default(0);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('balance_sheet_totals');
    }
};
