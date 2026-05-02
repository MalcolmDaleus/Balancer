<?php

namespace App\Http\Controllers;

use App\Http\Requests\Api\StoreRecurringPaymentStreamRequest;
use App\Http\Requests\Api\UpdateRecurringPaymentStreamRequest;
use App\Http\Requests\Api\UpdateRecurringPaymentPriceRequest;
use App\Http\Resources\RecurringPaymentStreamResource;
use App\Models\RecurringPaymentEntry;
use App\Models\RecurringPaymentStream;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;

class RecurringPaymentStreamController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        $this->authorize('viewAny', RecurringPaymentStream::class);

        $streams = RecurringPaymentStream::where('user_id', auth()->id())
            ->with(['category', 'entries'])
            ->orderBy('name')
            ->get();

        return RecurringPaymentStreamResource::collection($streams);
    }

    public function store(StoreRecurringPaymentStreamRequest $request): RecurringPaymentStreamResource
    {
        $this->authorize('create', RecurringPaymentStream::class);

        $stream = RecurringPaymentStream::create(array_merge(
            $request->validated(),
            ['user_id' => auth()->id()]
        ));

        return new RecurringPaymentStreamResource($stream->load(['category', 'entries']));
    }

    public function show(RecurringPaymentStream $recurringPaymentStream): RecurringPaymentStreamResource
    {
        $this->authorize('view', $recurringPaymentStream);

        return new RecurringPaymentStreamResource($recurringPaymentStream->load(['category', 'entries']));
    }

    public function update(UpdateRecurringPaymentStreamRequest $request, RecurringPaymentStream $recurringPaymentStream): RecurringPaymentStreamResource
    {
        $this->authorize('update', $recurringPaymentStream);

        $recurringPaymentStream->update($request->validated());

        return new RecurringPaymentStreamResource($recurringPaymentStream->fresh()->load(['category', 'entries']));
    }

    /**
     * Atomically update the price (and optionally frequency/schedule) of a stream.
     *
     * Ends the current active entry the day before the new start_date, then creates
     * a new entry with the supplied values. This preserves the full version history
     * while presenting a simple "update subscription" action to the user.
     *
     * Body: { amount, start_date, frequency?, day_of_month?, day_of_week? }
     */
    public function updatePrice(UpdateRecurringPaymentPriceRequest $request, RecurringPaymentStream $recurringPaymentStream): RecurringPaymentStreamResource
    {
        $this->authorize('update', $recurringPaymentStream);

        $data      = $request->validated();
        $startDate = Carbon::parse($data['start_date']);

        DB::transaction(function () use ($recurringPaymentStream, $data, $startDate) {
            // End any currently active entries the day before the new one starts.
            $recurringPaymentStream->entries()
                ->where('active', true)
                ->whereNull('end_date')
                ->orWhere('end_date', '>=', $startDate->toDateString())
                ->update([
                    'active'   => false,
                    'end_date' => $startDate->copy()->subDay()->toDateString(),
                ]);

            // Create the replacement entry inheriting frequency from the last entry
            // unless the caller explicitly overrides it.
            $previous = $recurringPaymentStream->entries()
                ->orderByDesc('start_date')
                ->first();

            RecurringPaymentEntry::create([
                'user_id'                     => $recurringPaymentStream->user_id,
                'recurring_payment_stream_id'  => $recurringPaymentStream->id,
                'amount'                       => $data['amount'],
                'frequency'                    => $data['frequency']    ?? $previous?->frequency    ?? 'monthly',
                'day_of_month'                 => $data['day_of_month'] ?? $previous?->day_of_month ?? null,
                'day_of_week'                  => $data['day_of_week']  ?? $previous?->day_of_week  ?? null,
                'start_date'                   => $startDate->toDateString(),
                'end_date'                     => null,
                'active'                       => true,
            ]);
        });

        return new RecurringPaymentStreamResource($recurringPaymentStream->fresh()->load(['category', 'entries']));
    }

    /**
     * Streams are always soft-deleted once they exist — never hard-deleted.
     * Hard deletion would orphan historical purchases linked to the stream's entries.
     */
    public function destroy(RecurringPaymentStream $recurringPaymentStream): JsonResponse
    {
        $this->authorize('delete', $recurringPaymentStream);

        $recurringPaymentStream->delete(); // always soft delete

        return response()->json(null, 204);
    }
}
