<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Adds soft-delete support to all three category tables.
 *
 * Categories are "abstract" records — they are never hard-deleted once a financial
 * record references them.  Setting deleted_at (soft delete) hides them from UI pickers
 * while keeping them available for historical display via ->withTrashed() on relationships.
 *
 * The category tables currently have no timestamps; we add deleted_at only.
 */
return new class extends Migration
{
    private array $tables = [
        'income_categories',
        'purchase_categories',
        'debt_categories',
    ];

    public function up(): void
    {
        foreach ($this->tables as $tableName) {
            Schema::table($tableName, function (Blueprint $blueprint) {
                $blueprint->softDeletes();
            });
        }
    }

    public function down(): void
    {
        foreach ($this->tables as $tableName) {
            Schema::table($tableName, function (Blueprint $blueprint) {
                $blueprint->dropSoftDeletes();
            });
        }
    }
};
