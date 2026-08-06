<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Align purchase/debt classifiers with recurring_payment_categories:
 * `name` column + timestamps.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('purchase_categories', function (Blueprint $table) {
            $table->renameColumn('category_name', 'name');
            $table->timestamps();
        });

        Schema::table('debt_categories', function (Blueprint $table) {
            $table->renameColumn('category_name', 'name');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::table('purchase_categories', function (Blueprint $table) {
            $table->dropTimestamps();
            $table->renameColumn('name', 'category_name');
        });

        Schema::table('debt_categories', function (Blueprint $table) {
            $table->dropTimestamps();
            $table->renameColumn('name', 'category_name');
        });
    }
};
