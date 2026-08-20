<?php

namespace App\Services;

use App\Models\RecurringPaymentEntry;
use App\Models\RecurringPaymentStream;
use App\Models\RegularIncomeSchedule;
use App\Models\RegularIncomeScheduleVersion;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * End active instrument versions/entries and open a new row from a start date.
 *
 * Shared by income schedule amount updates and recurring stream price updates.
 */
class InstrumentVersionRolloverService
{
    /**
     * Roll a regular income schedule to a new amount (and optional schedule fields).
     *
     * @param  array{amount: mixed, frequency?: mixed, day_of_month?: mixed, day_of_week?: mixed, anchor_date?: mixed}  $data
     */
    public function rollIncomeScheduleAmount(
        RegularIncomeSchedule $schedule,
        array $data,
        Carbon $startDate,
    ): void {
        DB::transaction(function () use ($schedule, $data, $startDate) {
            $schedule->versions()
                ->where('active', true)
                ->where(function ($q) use ($startDate) {
                    $q->whereNull('end_date')
                      ->orWhere('end_date', '>=', $startDate->toDateString());
                })
                ->update([
                    'active'   => false,
                    'end_date' => $startDate->copy()->subDay()->toDateString(),
                ]);

            $previous = $schedule->versions()
                ->orderByDesc('start_date')
                ->first();

            RegularIncomeScheduleVersion::create([
                'user_id'             => $schedule->user_id,
                'regular_schedule_id' => $schedule->id,
                'amount'              => $data['amount'],
                'frequency'           => $data['frequency'] ?? $previous?->frequency ?? 'monthly',
                'day_of_month'        => $data['day_of_month'] ?? $previous?->day_of_month,
                'day_of_week'         => $data['day_of_week'] ?? $previous?->day_of_week,
                'anchor_date'         => $data['anchor_date'] ?? $previous?->anchor_date,
                'start_date'          => $startDate->toDateString(),
                'end_date'            => null,
                'active'              => true,
            ]);
        });
    }

    /**
     * Roll a recurring payment stream to a new price (and optional schedule fields).
     *
     * @param  array{amount: mixed, frequency?: mixed, day_of_month?: mixed, day_of_week?: mixed}  $data
     */
    public function rollRecurringStreamPrice(
        RecurringPaymentStream $stream,
        array $data,
        Carbon $startDate,
    ): void {
        DB::transaction(function () use ($stream, $data, $startDate) {
            // End any currently active entries the day before the new one starts.
            // OR must be grouped or SQL precedence drops the stream_id constraint
            // from the second branch (cross-tenant write risk).
            $stream->entries()
                ->where('active', true)
                ->where(function ($q) use ($startDate) {
                    $q->whereNull('end_date')
                      ->orWhere('end_date', '>=', $startDate->toDateString());
                })
                ->update([
                    'active'   => false,
                    'end_date' => $startDate->copy()->subDay()->toDateString(),
                ]);

            $previous = $stream->entries()
                ->orderByDesc('start_date')
                ->first();

            RecurringPaymentEntry::create([
                'user_id'                     => $stream->user_id,
                'recurring_payment_stream_id' => $stream->id,
                'amount'                      => $data['amount'],
                'frequency'                   => $data['frequency'] ?? $previous?->frequency ?? 'monthly',
                'day_of_month'                => $data['day_of_month'] ?? $previous?->day_of_month ?? null,
                'day_of_week'                 => $data['day_of_week'] ?? $previous?->day_of_week ?? null,
                'start_date'                  => $startDate->toDateString(),
                'end_date'                    => null,
                'active'                      => true,
            ]);
        });
    }
}
