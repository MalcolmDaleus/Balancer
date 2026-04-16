<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Links a refund income_entry back to its source purchase.
 * Nullable because only refund entries have this set; regular income entries do not.
 * nullOnDelete: if the original purchase is hard-deleted the link is cleared,
 * but the income entry (and its amount) remains.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('income_entries', function (Blueprint $table) {
            $table->foreignId('purchase_id')
                ->nullable()
                ->after('month')
                ->constrained('purchases')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('income_entries', function (Blueprint $table) {
            $table->dropConstrainedForeignId('purchase_id');
        });
    }
};
