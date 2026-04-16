<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class IncomeEntryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'               => $this->id,
            'user_id'          => $this->user_id,
            'income_stream_id' => $this->income_stream_id,
            'amount'           => (float) $this->amount,
            'month'            => $this->month?->toDateString(),
            'purchase_id'      => $this->purchase_id,
            'stream'           => new IncomeStreamResource($this->whenLoaded('stream')),
            'created_at'       => $this->created_at,
            'updated_at'       => $this->updated_at,
        ];
    }
}
