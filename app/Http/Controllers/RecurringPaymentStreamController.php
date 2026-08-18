<?php

namespace App\Http\Controllers;

use App\Exceptions\DomainException;
use App\Http\Requests\Api\StoreRecurringPaymentStreamRequest;
use App\Http\Requests\Api\UpdateRecurringPaymentStreamRequest;
use App\Http\Requests\Api\UpdateRecurringPaymentPriceRequest;
use App\Http\Resources\RecurringPaymentStreamResource;
use App\Models\BalanceSheetTotal;
use App\Models\RecurringPaymentEntry;
use App\Models\RecurringPaymentStream;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;

class RecurringPaymentStreamController extends Controller
{
    /**
     * List active (non-archived) streams.
     * Pass ?archived=1 to get soft-deleted streams instead.
     */
    public function index(): AnonymousResourceCollection
    {
        $this->authorize('viewAny', RecurringPaymentStream::class);

        $archived = request()->boolean('archived');

        $query = $archived
            ? RecurringPaymentStream::onlyTrashed()->where('user_id', auth()->id())
            : RecurringPaymentStream::where('user_id', auth()->id());

        $streams = $query
            ->with(['category', 'entries' => fn ($q) => $q->orderByDesc('start_date')])
            ->orderBy('name')
            ->get();

        return RecurringPaymentStreamResource::collection($streams);
    }

    public function store(StoreRecurringPaymentStreamRequest $request): RecurringPaymentStreamResource
    {
        $this->authorize('create', RecurringPaymentStream::class);

        $data = $request->validated();

        $stream = DB::transaction(function () use ($data) {
            $stream = RecurringPaymentStream::create([
                'user_id'                       => auth()->id(),
                'recurring_payment_category_id' => $data['recurring_payment_category_id'] ?? null,
                'name'                          => $data['name'],
                'description'                   => $data['description'] ?? null,
                'active'                        => true,
            ]);

            RecurringPaymentEntry::create([
                'user_id'                     => $stream->user_id,
                'recurring_payment_stream_id' => $stream->id,
                'amount'                      => $data['amount'],
                'frequency'                   => $data['frequency'],
                'day_of_month'                => $data['day_of_month'] ?? null,
                'day_of_week'                 => $data['day_of_week'] ?? null,
                'start_date'                  => $data['start_date'],
                'end_date'                    => null,
                'active'                      => true,
            ]);

            return $stream;
        });

        $stream->refresh();

        return new RecurringPaymentStreamResource(
            $stream->load(['category', 'entries' => fn ($q) => $q->orderByDesc('start_date')])
        );
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
            // OR must be grouped or SQL precedence drops the stream_id constraint
            // from the second branch (cross-tenant write risk).
            $recurringPaymentStream->entries()
                ->where('active', true)
                ->where(function ($q) use ($startDate) {
                    $q->whereNull('end_date')
                      ->orWhere('end_date', '>=', $startDate->toDateString());
                })
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

        return new RecurringPaymentStreamResource($recurringPaymentStream->fresh()->load(['category', 'entries' => fn ($q) => $q->orderByDesc('start_date')]));
    }

    /**
     * Queue or cancel a pause/resume for this stream.
     *
     * - No pending change → queues the opposite of the current `active` state.
     * - Pending change already queued → cancels it (sets pending_active back to null).
     *
     * The queued change is committed by RecurringPaymentCycleService on the next
     * charge occurrence date (dashboard/cron process path). The live `active`
     * column used by balance sheet queries is not touched here.
     */
    public function toggle(RecurringPaymentStream $recurringPaymentStream): RecurringPaymentStreamResource
    {
        $this->authorize('update', $recurringPaymentStream);

        if ($recurringPaymentStream->pending_active !== null) {
            // Cancel the pending change — stream stays in its current live state
            $recurringPaymentStream->update(['pending_active' => null]);
        } else {
            // Queue the opposite of the current live state
            $recurringPaymentStream->update(['pending_active' => !$recurringPaymentStream->active]);
        }

        return new RecurringPaymentStreamResource(
            $recurringPaymentStream->fresh()->load(['category', 'entries' => fn ($q) => $q->orderByDesc('start_date')])
        );
    }

    /**
     * Archive (soft-delete) a stream.
     * Already-archived streams are silently ignored.
     */
    public function destroy(RecurringPaymentStream $recurringPaymentStream): JsonResponse
    {
        $this->authorize('delete', $recurringPaymentStream);

        $recurringPaymentStream->delete();

        return response()->json(null, 204);
    }

    /**
     * Restore a soft-deleted (archived) stream.
     */
    public function restore(int $recurringPaymentStream): RecurringPaymentStreamResource
    {
        $stream = RecurringPaymentStream::withTrashed()
            ->where('user_id', auth()->id())
            ->findOrFail($recurringPaymentStream);

        $this->authorize('restore', $stream);

        $stream->restore();

        return new RecurringPaymentStreamResource($stream->fresh()->load(['category', 'entries' => fn ($q) => $q->orderByDesc('start_date')]));
    }

    /**
     * Permanently delete an archived stream.
     *
     * Blocked if the stream has contributed to any locked (closed) balance sheet.
     * A stream "contributed" if it has entries with a start_date before or during
     * the most recently locked month — meaning it appeared in at least one snapshot.
     */
    public function hardDestroy(int $recurringPaymentStream): JsonResponse
    {
        $stream = RecurringPaymentStream::withTrashed()
            ->where('user_id', auth()->id())
            ->findOrFail($recurringPaymentStream);

        $this->authorize('delete', $stream);

        // Determine if any entry was ever active during a locked month.
        $latestLocked = BalanceSheetTotal::where('user_id', $stream->user_id)->max('month');

        if ($latestLocked) {
            $latestLockedEnd = Carbon::parse($latestLocked)->endOfMonth()->toDateString();
            $hasLockedEntries = $stream->entries()->withTrashed()
                ->where('start_date', '<=', $latestLockedEnd)
                ->exists();

            if ($hasLockedEntries) {
                throw new DomainException(
                    'locked_month',
                    'This stream has appeared in a closed balance sheet and cannot be permanently deleted.',
                    423,
                );
            }
        }

        if ($stream->charges()->exists()) {
            throw new DomainException(
                'has_facts',
                'This stream has charged Facts and cannot be permanently deleted. Soft-archive it instead.',
            );
        }

        $stream->forceDelete();

        return response()->json(null, 204);
    }
}
