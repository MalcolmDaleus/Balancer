<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('purchases', function (Blueprint $table) {
            // Nullable FK so manual purchases are unaffected.
            // nullOnDelete: if the recurring definition is deleted, the generated purchase stays
            // but loses its link (becomes a regular manual purchase record).
            $table->foreignId('recurring_purchase_id')
                ->nullable()
                ->after('url')
                ->constrained('recurring_purchases')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('purchases', function (Blueprint $table) {
            $table->dropConstrainedForeignId('recurring_purchase_id');
        });
    }
};
