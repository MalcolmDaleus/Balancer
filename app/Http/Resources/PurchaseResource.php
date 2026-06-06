<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PurchaseResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                          => $this->id,
            'user_id'                     => $this->user_id,
            'category_id'                 => $this->category_id,
            'amount'                      => (float) $this->amount,
            'description'                 => $this->description,
            'date'                        => $this->date?->toDateString(),
            'attachment_path'             => $this->attachment_path,
            'url'                         => $this->url,
            'is_refunded'                 => $this->is_refunded,
            'refunded_total'              => $this->refunded_total,
            'remaining_refundable'        => $this->remaining_refundable,
            'refund_status'               => $this->refund_status,
            'recurring_payment_entry_id'  => $this->recurring_payment_entry_id,
            'category'                    => new PurchaseCategoryResource($this->whenLoaded('category')),
            'created_at'                  => $this->created_at,
            'updated_at'                  => $this->updated_at,
        ];
    }
}
