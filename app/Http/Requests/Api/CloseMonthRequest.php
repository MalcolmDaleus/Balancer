<?php

namespace App\Http\Requests\Api;

use App\Services\DateTimeService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class CloseMonthRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('month') && preg_match('/^\d{4}-\d{2}$/', (string) $this->month)) {
            $this->merge(['month' => $this->month . '-01']);
        }
    }

    public function rules(): array
    {
        return [
            'month' => ['required', 'date'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            if (! $this->filled('month')) {
                return;
            }

            $month = DateTimeService::normalizeMonth($this->input('month'));
            $current = DateTimeService::normalizeMonth(now());

            if ($month->gt($current)) {
                $validator->errors()->add('month', 'Cannot close a future month.');
            }
        });
    }
}
