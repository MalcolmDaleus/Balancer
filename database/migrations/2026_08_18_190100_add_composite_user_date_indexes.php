<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('income_entries', function (Blueprint $table) {
            $table->index(['user_id', 'received_at'], 'income_entries_user_id_received_at_index');
        });

        Schema::table('purchases', function (Blueprint $table) {
            $table->index(['user_id', 'date'], 'purchases_user_id_date_index');
        });
    }

    public function down(): void
    {
        Schema::table('income_entries', function (Blueprint $table) {
            $table->dropIndex('income_entries_user_id_received_at_index');
        });

        Schema::table('purchases', function (Blueprint $table) {
            $table->dropIndex('purchases_user_id_date_index');
        });
    }
};
