<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class RecurringPaymentEntryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                           => $this->id,
            'user_id'                      => $this->user_id,
            'recurring_payment_stream_id'  => $this->recurring_payment_stream_id,
            'amount'                       => (float) $this->amount,
            'frequency'                    => $this->frequency,
            'day_of_month'                 => $this->day_of_month,
            'day_of_week'                  => $this->day_of_week,
            'start_date'                   => $this->start_date?->toDateString(),
            'end_date'                     => $this->end_date?->toDateString(),
            'active'                       => $this->active,
            'deleted_at'                   => $this->deleted_at,
            'stream'                       => new RecurringPaymentStreamResource($this->whenLoaded('stream')),
            'created_at'                   => $this->created_at,
            'updated_at'                   => $this->updated_at,
        ];
    }
}
