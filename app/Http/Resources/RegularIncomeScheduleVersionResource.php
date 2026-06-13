<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class RegularIncomeScheduleVersionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                  => $this->id,
            'regular_schedule_id' => $this->regular_schedule_id,
            'amount'              => (float) $this->amount,
            'frequency'           => $this->frequency?->value ?? $this->frequency,
            'day_of_month'        => $this->day_of_month,
            'day_of_week'         => $this->day_of_week,
            'anchor_date'         => $this->anchor_date?->toDateString(),
            'start_date'          => $this->start_date?->toDateString(),
            'end_date'            => $this->end_date?->toDateString(),
            'active'              => (bool) $this->active,
            'created_at'          => $this->created_at,
            'updated_at'          => $this->updated_at,
        ];
    }
}
