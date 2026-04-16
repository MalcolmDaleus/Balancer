<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DebtResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                => $this->id,
            'user_id'           => $this->user_id,
            'category_id'       => $this->category_id,
            'amount'            => (float) $this->amount,
            'description'       => $this->description,
            'issue_date'        => $this->issue_date?->toDateString(),
            'settle_date'       => $this->settle_date?->toDateString(),
            'notes'             => $this->notes,
            'remaining_balance' => (float) $this->remaining_balance,
            'is_settled'        => $this->is_settled,
            'category'          => new DebtCategoryResource($this->whenLoaded('category')),
            'payments'          => DebtPaymentResource::collection($this->whenLoaded('payments')),
            'created_at'        => $this->created_at,
            'updated_at'        => $this->updated_at,
        ];
    }
}
