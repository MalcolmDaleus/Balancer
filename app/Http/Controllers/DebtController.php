<?php

namespace App\Http\Controllers;

use App\Exceptions\DomainException;
use App\Http\Requests\Api\ForgiveDebtRequest;
use App\Http\Requests\Api\StoreDebtRequest;
use App\Http\Requests\Api\UpdateDebtRequest;
use App\Http\Resources\DebtResource;
use App\Models\Debt;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class DebtController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Debt::class);

        $debts = Debt::where('user_id', auth()->id())
            ->with(['category', 'payments'])
            ->latest('issue_date')
            ->get();

        return DebtResource::collection($debts);
    }

    public function store(StoreDebtRequest $request): DebtResource
    {
        $this->authorize('create', Debt::class);

        $debt = Debt::create(array_merge(
            $request->validated(),
            ['user_id' => auth()->id()]
        ));

        return new DebtResource($debt->refresh()->load(['category', 'payments']));
    }

    public function show(Debt $debt): DebtResource
    {
        $this->authorize('view', $debt);

        return new DebtResource($debt->load(['category', 'payments']));
    }

    public function update(UpdateDebtRequest $request, Debt $debt): DebtResource
    {
        $this->authorize('update', $debt);

        $debt->update($request->validated());

        return new DebtResource($debt->fresh()->load(['category', 'payments']));
    }

    public function destroy(Debt $debt): JsonResponse
    {
        $this->authorize('delete', $debt);

        // Open unused debts in an open month can be erased. Open debts with
        // history cannot be hidden — settle or forgive first. Closed debts archive.
        if ($debt->canHardDelete()) {
            $debt->forceDelete();
        } elseif ($debt->canArchive()) {
            $debt->delete();
        } else {
            throw new DomainException(
                'debt_open',
                'Open debts cannot be archived. Pay them off or forgive them first.',
            );
        }

        return response()->json(null, 204);
    }

    /**
     * Mark a debt as forgiven.
     *
     * Forgiveness can only be applied when the debt still has a remaining balance.
     * A fully paid debt is already "settled" and cannot be retroactively forgiven.
     * Sets is_forgiven = true and settle_date to the given date (default: today).
     */
    public function forgive(ForgiveDebtRequest $request, Debt $debt): DebtResource
    {
        $this->authorize('update', $debt);

        if ($debt->is_forgiven) {
            throw new DomainException('already_forgiven', 'This debt has already been forgiven.');
        }

        if ($debt->remaining_cents <= 0) {
            throw new DomainException('already_settled', 'A fully paid debt cannot be marked as forgiven.');
        }

        $forgiveDate = $request->input('forgive_date') ?? now()->toDateString();

        $debt->update([
            'is_forgiven' => true,
            'settle_date' => $forgiveDate,
            'notes' => $request->input('notes', $debt->notes),
        ]);

        return new DebtResource($debt->fresh()->load(['category', 'payments']));
    }
}
