<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('income_entries', function (Blueprint $table) {
            $table->string('type', 32)->nullable()->after('user_id');
            $table->string('name', 64)->nullable()->after('type');
            $table->string('description', 255)->nullable()->after('name');
            $table->date('received_at')->nullable()->after('description');
            $table->foreignId('regular_schedule_id')
                ->nullable()
                ->after('purchase_id')
                ->constrained('regular_income_schedules')
                ->nullOnDelete();
            $table->foreignId('regular_schedule_version_id')
                ->nullable()
                ->after('regular_schedule_id')
                ->constrained('regular_income_schedule_versions')
                ->nullOnDelete();
        });

        $this->migrateExistingRows();

        Schema::table('income_entries', function (Blueprint $table) {
            $table->dropForeign(['income_stream_id']);
        });

        // Drop legacy month index before removing the column (required for SQLite).
        try {
            Schema::table('income_entries', function (Blueprint $table) {
                $table->dropIndex(['month']);
            });
        } catch (\Throwable) {
            // Index may already be absent depending on migration history.
        }

        Schema::table('income_entries', function (Blueprint $table) {
            $table->dropColumn(['income_stream_id', 'month']);
            $table->index('received_at');
            $table->unique(['regular_schedule_version_id', 'received_at'], 'income_entries_version_received_unique');
        });
    }

    public function down(): void
    {
        Schema::table('income_entries', function (Blueprint $table) {
            $table->dropUnique(['regular_schedule_version_id', 'received_at']);
            $table->dropIndex(['received_at']);
            $table->dropForeign(['regular_schedule_id']);
            $table->dropForeign(['regular_schedule_version_id']);
            $table->dropColumn([
                'type',
                'name',
                'description',
                'received_at',
                'regular_schedule_id',
                'regular_schedule_version_id',
            ]);
            $table->foreignId('income_stream_id')->nullable()->constrained('income_streams')->cascadeOnDelete();
            $table->date('month')->nullable();
        });
    }

    private function migrateExistingRows(): void
    {
        $entries = DB::table('income_entries')->orderBy('id')->get();

        foreach ($entries as $entry) {
            $receivedAt = $entry->month;

            if ($entry->purchase_id !== null) {
                $purchase = DB::table('purchases')->where('id', $entry->purchase_id)->first();
                $name = 'Refund: ' . ($purchase?->description ?? 'Purchase');

                DB::table('income_entries')->where('id', $entry->id)->update([
                    'type'        => 'refund',
                    'name'        => $name,
                    'description' => null,
                    'received_at' => $receivedAt,
                ]);

                continue;
            }

            $stream = DB::table('income_streams')->where('id', $entry->income_stream_id)->first();

            DB::table('income_entries')->where('id', $entry->id)->update([
                'type'        => 'irregular',
                'name'        => $stream?->name ?? 'Income',
                'description' => $stream?->description,
                'received_at' => $receivedAt,
            ]);
        }
    }
};
