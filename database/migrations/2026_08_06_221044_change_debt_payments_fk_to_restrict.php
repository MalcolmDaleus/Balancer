<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Prevent DB-level cascade from wiping payment Facts (bypasses MonthLockable).
 * Hard-delete a debt only when it has zero payments; otherwise soft-archive.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('debt_payments', function (Blueprint $table) {
            $table->dropForeign(['debt_id']);
            $table->foreign('debt_id')
                ->references('id')
                ->on('debts')
                ->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('debt_payments', function (Blueprint $table) {
            $table->dropForeign(['debt_id']);
            $table->foreign('debt_id')
                ->references('id')
                ->on('debts')
                ->cascadeOnDelete();
        });
    }
};
