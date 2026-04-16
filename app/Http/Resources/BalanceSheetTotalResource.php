<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BalanceSheetTotalResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'               => $this->id,
            'user_id'          => $this->user_id,
            'month'            => $this->month?->toDateString(),
            'total_income'     => (float) $this->total_income,
            'total_debt_paid'  => (float) $this->total_debt_paid,
            'total_spending'   => (float) $this->total_spending,
            'savings_snapshot' => (float) $this->savings_snapshot,
            'roll_over'        => (float) $this->roll_over,
            'net_change'       => (float) $this->net_change,
            'created_at'       => $this->created_at,
            'updated_at'       => $this->updated_at,
        ];
    }
}
