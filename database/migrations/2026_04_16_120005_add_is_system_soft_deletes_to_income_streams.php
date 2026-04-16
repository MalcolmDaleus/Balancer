<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Adds is_system and soft-delete support to income_streams.
 *
 * is_system = true marks streams managed by the application (e.g. the system "Refunds"
 * stream that is created automatically and must not be edited or deleted by the user).
 * System streams are hidden from the income-entry editor by default but their entries
 * always appear in balance sheet totals.
 *
 * deleted_at enables soft-deletion so user-created streams can be retired from pickers
 * without breaking historical income entries that reference them.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('income_streams', function (Blueprint $table) {
            $table->boolean('is_system')->default(false)->after('description');
            $table->softDeletes()->after('is_system');
        });
    }

    public function down(): void
    {
        Schema::table('income_streams', function (Blueprint $table) {
            $table->dropColumn('is_system');
            $table->dropSoftDeletes();
        });
    }
};
