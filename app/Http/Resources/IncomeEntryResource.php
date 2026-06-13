<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class IncomeEntryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                          => $this->id,
            'user_id'                     => $this->user_id,
            'type'                        => $this->type?->value ?? $this->type,
            'name'                        => $this->name,
            'description'                 => $this->description,
            'amount'                      => (float) $this->amount,
            'received_at'                 => $this->received_at?->toDateString(),
            'purchase_id'                 => $this->purchase_id,
            'purchase_description'        => $this->purchase_id ? $this->sourcePurchase?->description : null,
            'regular_schedule_id'         => $this->regular_schedule_id,
            'regular_schedule_version_id' => $this->regular_schedule_version_id,
            'regular_schedule'            => new RegularIncomeScheduleResource($this->whenLoaded('regularSchedule')),
            'created_at'                  => $this->created_at,
            'updated_at'                  => $this->updated_at,
        ];
    }
}
