<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class RecurringPaymentStreamResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                            => $this->id,
            'user_id'                       => $this->user_id,
            'recurring_payment_category_id' => $this->recurring_payment_category_id,
            'name'                          => $this->name,
            'description'                   => $this->description,
            'deleted_at'                    => $this->deleted_at,
            'category'                      => new RecurringPaymentCategoryResource($this->whenLoaded('category')),
            'entries'                       => RecurringPaymentEntryResource::collection($this->whenLoaded('entries')),
            'created_at'                    => $this->created_at,
            'updated_at'                    => $this->updated_at,
        ];
    }
}
