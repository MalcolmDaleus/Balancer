<?php

namespace App\Http\Requests\Api;

use App\Services\StatisticsService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StatisticsSeriesRequest extends FormRequest
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
        $view = (string) $this->input('view');
        $allowed = match ($view) {
            'trend' => array_keys(StatisticsService::TREND),
            'compare' => array_keys(StatisticsService::COMPARE),
            'share' => array_keys(StatisticsService::SHARE),
            default => [],
        };

        return [
            'view' => ['required', 'string', Rule::in(['trend', 'compare', 'share'])],
            'series' => ['required', 'string', Rule::in($allowed)],
            'window' => ['sometimes', Rule::in([
                ...array_map('strval', StatisticsService::WINDOWS),
                StatisticsService::WINDOW_ALL,
            ])],
        ];
    }
}
