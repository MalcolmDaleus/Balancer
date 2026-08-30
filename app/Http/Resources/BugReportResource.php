<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BugReportResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type?->value,
            'zone' => $this->zone?->value,
            'view' => $this->view?->value,
            'description' => $this->description,
            'created_at' => $this->created_at,
        ];
    }
}
