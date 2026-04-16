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
        Schema::table('balance_sheet_totals', function (Blueprint $table) {
            $table->unique(['user_id', 'month'], 'bst_user_month_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('balance_sheet_totals', function (Blueprint $table) {
            $table->dropUnique('bst_user_month_unique');
        });
    }
};
