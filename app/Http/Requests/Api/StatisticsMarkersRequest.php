<?php

namespace App\Http\Requests\Api;

use App\Services\StatisticsService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StatisticsMarkersRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'window' => ['sometimes', Rule::in([
                ...array_map('strval', StatisticsService::WINDOWS),
                StatisticsService::WINDOW_ALL,
            ])],
        ];
    }
}
