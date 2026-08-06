<?php

use Carbon\Carbon;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Dedicated recurring Facts table (Wave 3).
 * Migrates rows off purchases.recurring_payment_entry_id, then drops that FK.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('recurring_charges')) {
            Schema::create('recurring_charges', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->foreignId('recurring_payment_entry_id')
                    ->constrained('recurring_payment_entries')
                    ->restrictOnDelete();
                $table->foreignId('recurring_payment_stream_id')
                    ->constrained('recurring_payment_streams')
                    ->restrictOnDelete();
                $table->foreignId('recurring_payment_category_id')
                    ->nullable()
                    ->constrained('recurring_payment_categories')
                    ->nullOnDelete();
                $table->string('stream_name', 64);
                $table->string('category_name', 64)->nullable();
                $table->decimal('amount', 12, 2);
                $table->date('occurred_on')->index();
                $table->timestamps();

                $table->unique(
                    ['recurring_payment_entry_id', 'occurred_on'],
                    'recurring_charges_entry_date_unique'
                );
                $table->index(['user_id', 'occurred_on']);
            });
        }

        if (Schema::hasColumn('purchases', 'recurring_payment_entry_id')) {
            $rows = DB::table('purchases')
                ->whereNotNull('recurring_payment_entry_id')
                ->get();

            foreach ($rows as $purchase) {
                $entry = DB::table('recurring_payment_entries')
                    ->where('id', $purchase->recurring_payment_entry_id)
                    ->first();

                if (! $entry) {
                    continue;
                }

                $stream = DB::table('recurring_payment_streams')
                    ->where('id', $entry->recurring_payment_stream_id)
                    ->first();

                $category = null;
                if ($stream?->recurring_payment_category_id) {
                    $category = DB::table('recurring_payment_categories')
                        ->where('id', $stream->recurring_payment_category_id)
                        ->first();
                }

                DB::table('recurring_charges')->insertOrIgnore([
                    'user_id'                       => $purchase->user_id,
                    'recurring_payment_entry_id'    => $entry->id,
                    'recurring_payment_stream_id'   => $entry->recurring_payment_stream_id,
                    'recurring_payment_category_id' => $stream?->recurring_payment_category_id,
                    'stream_name'                   => $stream?->name ?? ($purchase->description ?? 'Recurring'),
                    'category_name'                 => $category?->name,
                    'amount'                        => $purchase->amount,
                    'occurred_on'                   => Carbon::parse($purchase->date)->toDateString(),
                    'created_at'                    => $purchase->created_at,
                    'updated_at'                    => $purchase->updated_at,
                ]);
            }

            DB::table('purchases')->whereNotNull('recurring_payment_entry_id')->delete();

            // MySQL: FK uses the unique index — drop FK before unique/column.
            Schema::table('purchases', function (Blueprint $table) {
                $table->dropForeign(['recurring_payment_entry_id']);
            });

            Schema::table('purchases', function (Blueprint $table) {
                try {
                    $table->dropUnique('purchases_recurring_entry_date_unique');
                } catch (\Throwable) {
                    // Already gone on some installs.
                }

                $table->dropColumn('recurring_payment_entry_id');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('recurring_charges');

        if (! Schema::hasColumn('purchases', 'recurring_payment_entry_id')) {
            Schema::table('purchases', function (Blueprint $table) {
                $table->foreignId('recurring_payment_entry_id')
                    ->nullable()
                    ->constrained('recurring_payment_entries')
                    ->nullOnDelete();
                $table->unique(
                    ['recurring_payment_entry_id', 'date'],
                    'purchases_recurring_entry_date_unique'
                );
            });
        }
    }
};
