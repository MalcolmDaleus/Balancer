<?php

namespace App\Http\Resources;

use App\Support\MoneyCents;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BalanceSheetTotalResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'month' => $this->month?->toDateString(),
            'total_income_cents' => MoneyCents::fromMajor($this->total_income),
            'total_debt_paid_cents' => MoneyCents::fromMajor($this->total_debt_paid),
            'total_spending_cents' => MoneyCents::fromMajor($this->total_spending),
            'total_recurring_cents' => MoneyCents::fromMajor($this->total_recurring),
            'savings_snapshot_cents' => MoneyCents::fromMajor($this->savings_snapshot),
            'roll_over_cents' => MoneyCents::fromMajor($this->roll_over),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
