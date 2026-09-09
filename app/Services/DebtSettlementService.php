<?php

namespace App\Services;

use App\Models\Debt;
use Illuminate\Support\Facades\DB;

/**
 * Single writer for debt settle_date based on payment Facts.
 *
 * Forgiven debts keep settle_date as the forgive event date and are not
 * recomputed from payments. Normal debts: settle when remaining <= 0,
 * clear settle_date when payments no longer cover the principal.
 */
class DebtSettlementService
{
    public function sync(Debt $debt): void
    {
        DB::transaction(function () use ($debt): void {
            $debt->refresh()->load('payments');

            if ($debt->is_forgiven) {
                return;
            }

            if ($debt->remaining_cents <= 0) {
                if ($debt->settle_date !== null) {
                    return;
                }

                $latestPaidAt = $debt->payments
                    ->sortByDesc(fn ($p) => $p->paid_at?->timestamp ?? 0)
                    ->first()
                    ?->paid_at;

                if ($latestPaidAt !== null) {
                    $debt->update(['settle_date' => $latestPaidAt->toDateString()]);
                }

                return;
            }

            if ($debt->settle_date !== null) {
                $debt->update(['settle_date' => null]);
            }
        });
    }
}
