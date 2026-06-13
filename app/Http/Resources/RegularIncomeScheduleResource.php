<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class RegularIncomeScheduleResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'             => $this->id,
            'user_id'        => $this->user_id,
            'name'           => $this->name,
            'description'    => $this->description,
            'active'         => (bool) $this->active,
            'pending_active' => $this->pending_active,
            'deleted_at'     => $this->deleted_at,
            'versions'       => RegularIncomeScheduleVersionResource::collection($this->whenLoaded('versions')),
            'created_at'     => $this->created_at,
            'updated_at'     => $this->updated_at,
        ];
    }
}
