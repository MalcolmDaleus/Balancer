<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('regular_income_schedule_versions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('regular_schedule_id')
                ->constrained('regular_income_schedules')
                ->cascadeOnDelete();
            $table->decimal('amount', 12, 2);
            $table->string('frequency', 32);
            $table->unsignedTinyInteger('day_of_month')->nullable();
            $table->unsignedTinyInteger('day_of_week')->nullable();
            $table->date('anchor_date')->nullable();
            $table->date('start_date');
            $table->date('end_date')->nullable();
            $table->boolean('active')->default(true);
            $table->timestamps();

            $table->index(['regular_schedule_id', 'active'], 'risv_schedule_active_idx');
            $table->index(['user_id', 'active'], 'risv_user_active_idx');
        });

        if (DB::getDriverName() === 'mysql') {
            DB::statement('
                ALTER TABLE regular_income_schedule_versions
                ADD CONSTRAINT chk_risv_amount_positive CHECK (amount > 0)
            ');
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('regular_income_schedule_versions');
    }
};
