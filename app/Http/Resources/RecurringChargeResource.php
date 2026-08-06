<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class RecurringChargeResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                            => $this->id,
            'user_id'                       => $this->user_id,
            'recurring_payment_entry_id'    => $this->recurring_payment_entry_id,
            'recurring_payment_stream_id'   => $this->recurring_payment_stream_id,
            'recurring_payment_category_id' => $this->recurring_payment_category_id,
            'stream_name'                   => $this->stream_name,
            'category_name'                 => $this->category_name,
            'amount'                        => (float) $this->amount,
            'occurred_on'                   => $this->occurred_on?->toDateString(),
            'created_at'                    => $this->created_at,
            'updated_at'                    => $this->updated_at,
        ];
    }
}
