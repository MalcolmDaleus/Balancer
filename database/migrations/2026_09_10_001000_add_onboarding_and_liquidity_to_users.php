<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->unsignedBigInteger('liquidity_seed')->default(0)->after('locale');
            $table->unsignedBigInteger('savings_seed')->default(0)->after('liquidity_seed');
            $table->date('liquidity_seed_on')->nullable()->after('savings_seed');
            $table->timestamp('onboarded_at')->nullable()->after('liquidity_seed_on');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'liquidity_seed',
                'savings_seed',
                'liquidity_seed_on',
                'onboarded_at',
            ]);
        });
    }
};
