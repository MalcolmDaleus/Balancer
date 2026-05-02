<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('savings', function (Blueprint $table) {
            // 'deposit' is the default so existing rows are automatically valid.
            $table->enum('type', ['deposit', 'withdrawal'])->default('deposit')->after('amount');
            $table->string('notes', 500)->nullable()->after('type');
        });
    }

    public function down(): void
    {
        Schema::table('savings', function (Blueprint $table) {
            $table->dropColumn(['type', 'notes']);
        });
    }
};
