<?php

namespace App\Http\Controllers;

use App\Http\Requests\Api\StoreRecurringPaymentEntryRequest;
use App\Http\Requests\Api\UpdateRecurringPaymentEntryRequest;
use App\Http\Resources\RecurringPaymentEntryResource;
use App\Models\RecurringPaymentEntry;
use App\Models\RecurringPaymentStream;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class RecurringPaymentEntryController extends Controller
{
    /**
     * List all entries for the authenticated user, optionally filtered by stream.
     */
    public function index(): AnonymousResourceCollection
    {
        $this->authorize('viewAny', RecurringPaymentEntry::class);

        $entries = RecurringPaymentEntry::where('user_id', auth()->id())
            ->with('stream')
            ->orderByDesc('start_date')
            ->get();

        return RecurringPaymentEntryResource::collection($entries);
    }

    /**
     * Create a new recurring payment entry.
     *
     * When creating a new entry because a price has changed, the caller is responsible
     * for setting end_date on the previous entry via a separate update request.
     */
    public function store(StoreRecurringPaymentEntryRequest $request): RecurringPaymentEntryResource
    {
        $this->authorize('create', RecurringPaymentEntry::class);

        $entry = RecurringPaymentEntry::create(array_merge(
            $request->validated(),
            ['user_id' => auth()->id()]
        ));

        return new RecurringPaymentEntryResource($entry->load('stream'));
    }

    public function show(RecurringPaymentEntry $recurringPaymentEntry): RecurringPaymentEntryResource
    {
        $this->authorize('view', $recurringPaymentEntry);

        return new RecurringPaymentEntryResource($recurringPaymentEntry->load('stream'));
    }

    public function update(UpdateRecurringPaymentEntryRequest $request, RecurringPaymentEntry $recurringPaymentEntry): RecurringPaymentEntryResource
    {
        $this->authorize('update', $recurringPaymentEntry);

        $recurringPaymentEntry->update($request->validated());

        return new RecurringPaymentEntryResource($recurringPaymentEntry->fresh()->load('stream'));
    }

    /**
     * Deactivate an entry (soft delete).
     *
     * The entry's end_date is set to today and active is set to false so it stops
     * appearing in current-month projections. A soft delete is then applied so the
     * entry is hidden from normal queries but preserved for historical purchase links.
     */
    public function destroy(RecurringPaymentEntry $recurringPaymentEntry): JsonResponse
    {
        $this->authorize('delete', $recurringPaymentEntry);

        $recurringPaymentEntry->update([
            'active'   => false,
            'end_date' => Carbon::today()->toDateString(),
        ]);

        $recurringPaymentEntry->delete(); // soft delete

        return response()->json(null, 204);
    }
}
