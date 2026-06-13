<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('income_streams');
        Schema::dropIfExists('income_categories');
    }

    public function down(): void
    {
        Schema::create('income_categories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('category_name', 64);
            $table->softDeletes();
            $table->timestamps();
        });

        Schema::create('income_streams', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('category_id')->nullable()->constrained('income_categories')->nullOnDelete();
            $table->string('name', 64);
            $table->string('description', 255)->nullable();
            $table->boolean('is_system')->default(false);
            $table->softDeletes();
            $table->timestamps();
        });
    }
};
