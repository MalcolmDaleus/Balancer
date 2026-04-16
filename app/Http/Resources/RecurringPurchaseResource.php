<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class RecurringPurchaseResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'           => $this->id,
            'user_id'      => $this->user_id,
            'category_id'  => $this->category_id,
            'amount'       => (float) $this->amount,
            'description'  => $this->description,
            'frequency'    => $this->frequency,
            'day_of_month' => $this->day_of_month,
            'day_of_week'  => $this->day_of_week,
            'start_date'   => $this->start_date?->toDateString(),
            'end_date'     => $this->end_date?->toDateString(),
            'active'       => $this->active,
            'category'     => new PurchaseCategoryResource($this->whenLoaded('category')),
            'created_at'   => $this->created_at,
            'updated_at'   => $this->updated_at,
        ];
    }
}
