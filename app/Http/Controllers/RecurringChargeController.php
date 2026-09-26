<?php

namespace App\Http\Controllers;

use App\Http\Requests\Api\UpdateRecurringChargeRequest;
use App\Http\Resources\RecurringChargeResource;
use App\Models\RecurringCharge;
use App\Models\RecurringOccurrenceSkip;
use App\Services\BalanceSheetService;
use App\Services\RecurringPaymentMaterializationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;

class RecurringChargeController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        $this->authorize('viewAny', RecurringCharge::class);

        $userId = (int) auth()->id();
        app(RecurringPaymentMaterializationService::class)
            ->pruneFutureOpenMonthCharges($userId);
        $charges = RecurringCharge::forUser($userId)
            ->latest('occurred_on')
            ->get();

        return RecurringChargeResource::collection($charges)
            ->additional([
                'projected' => (new BalanceSheetService($userId))->upcomingRecurringCharges(),
            ]);
    }

    public function show(RecurringCharge $recurringCharge): RecurringChargeResource
    {
        $this->authorize('view', $recurringCharge);

        return new RecurringChargeResource($recurringCharge);
    }

    public function update(UpdateRecurringChargeRequest $request, RecurringCharge $recurringCharge): RecurringChargeResource
    {
        $this->authorize('update', $recurringCharge);

        $recurringCharge->update($request->validated());

        return new RecurringChargeResource($recurringCharge->fresh());
    }

    public function destroy(RecurringCharge $recurringCharge): JsonResponse
    {
        $this->authorize('delete', $recurringCharge);

        DB::transaction(function () use ($recurringCharge) {
            RecurringOccurrenceSkip::firstOrCreate([
                'recurring_payment_entry_id' => $recurringCharge->recurring_payment_entry_id,
                'occurrence_date'            => $recurringCharge->occurred_on->toDateString(),
            ], [
                'user_id' => $recurringCharge->user_id,
            ]);

            $recurringCharge->delete();
        });

        return response()->json(null, 204);
    }
}
