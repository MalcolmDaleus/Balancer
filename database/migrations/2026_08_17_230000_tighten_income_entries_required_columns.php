<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Close the Wave 3 redesign hole: type / name / received_at were left nullable
 * for safe backfill and never tightened. Also add a MySQL CHECK on type.
 *
 * Cleans legacy junk that would block NOT NULL / CHECK before altering.
 */
return new class extends Migration
{
    private const ALLOWED_TYPES = ['regular', 'irregular', 'refund'];

    public function up(): void
    {
        $this->cleanLegacyJunk();

        Schema::table('income_entries', function (Blueprint $table) {
            $table->string('type', 32)->nullable(false)->change();
            $table->string('name', 64)->nullable(false)->change();
            $table->date('received_at')->nullable(false)->change();
        });

        if (DB::getDriverName() === 'mysql') {
            DB::statement(
                "ALTER TABLE `income_entries`
                 ADD CONSTRAINT `chk_income_entries_type`
                 CHECK (`type` IN ('regular', 'irregular', 'refund'))"
            );
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement('ALTER TABLE `income_entries` DROP CHECK `chk_income_entries_type`');
        }

        Schema::table('income_entries', function (Blueprint $table) {
            $table->string('type', 32)->nullable()->change();
            $table->string('name', 64)->nullable()->change();
            $table->date('received_at')->nullable()->change();
        });
    }

    private function cleanLegacyJunk(): void
    {
        // Drop rows that cannot be salvaged (no date at all).
        DB::table('income_entries')->whereNull('received_at')->delete();

        // Backfill missing name.
        DB::table('income_entries')->whereNull('name')->orWhere('name', '')->update([
            'name' => 'Income',
        ]);

        // Backfill / coerce type. Refunds are identifiable via purchase_id.
        DB::table('income_entries')
            ->whereNotNull('purchase_id')
            ->where(function ($q) {
                $q->whereNull('type')->orWhereNotIn('type', self::ALLOWED_TYPES);
            })
            ->update(['type' => 'refund']);

        DB::table('income_entries')
            ->whereNull('purchase_id')
            ->where(function ($q) {
                $q->whereNull('type')->orWhereNotIn('type', self::ALLOWED_TYPES);
            })
            ->update(['type' => 'irregular']);
    }
};
