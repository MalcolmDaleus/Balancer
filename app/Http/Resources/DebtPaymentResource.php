<?php

namespace App\Http\Resources;

use App\Support\MoneyCents;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DebtPaymentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'debt_id' => $this->debt_id,
            'amount_cents' => MoneyCents::fromMajor($this->amount),
            'paid_at' => $this->paid_at?->toDateString(),
            'notes' => $this->notes,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
