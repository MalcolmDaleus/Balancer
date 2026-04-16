<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Re-enforces that every purchase must belong to a category.
 *
 * The 2026_04_16_111744 migration made category_id nullable across several tables.
 * Purchases are a special case: the product vision requires every purchase to have
 * an explicit category — there is no "Uncategorised" option for purchases.
 *
 * NOTE: Any existing rows with category_id = NULL must be back-filled before running
 * this migration in a production environment.  In a development/test environment the
 * schema is freshly migrated and no orphan rows exist.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('purchases', function (Blueprint $table) {
            $table->unsignedBigInteger('category_id')->nullable(false)->change();
        });
    }

    public function down(): void
    {
        Schema::table('purchases', function (Blueprint $table) {
            $table->unsignedBigInteger('category_id')->nullable()->change();
        });
    }
};
