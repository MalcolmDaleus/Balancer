<?php

namespace App\Http\Resources;

use App\Support\MoneyCents;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SavingResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'amount_cents' => MoneyCents::fromMajor($this->amount),
            'type' => $this->type ?? 'deposit',
            'notes' => $this->notes,
            'month' => $this->month?->toDateString(),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
