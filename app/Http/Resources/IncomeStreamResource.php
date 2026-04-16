<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class IncomeStreamResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'          => $this->id,
            'user_id'     => $this->user_id,
            'category_id' => $this->category_id,
            'name'        => $this->name,
            'description' => $this->description,
            'is_system'   => $this->is_system,
            'category'    => new IncomeCategoryResource($this->whenLoaded('category')),
            'created_at'  => $this->created_at,
            'updated_at'  => $this->updated_at,
        ];
    }
}
