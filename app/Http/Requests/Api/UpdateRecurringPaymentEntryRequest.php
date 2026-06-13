<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateRecurringPaymentEntryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'amount'       => ['sometimes', 'numeric', 'min:0.01', 'max:9999999.99'],
            'frequency'    => ['sometimes', 'string', Rule::in(['monthly', 'yearly'])],
            'day_of_month' => ['sometimes', 'integer', 'min:1', 'max:31'],
            'start_date'   => ['sometimes', 'date'],
            'end_date'     => ['sometimes', 'nullable', 'date'],
            'active'       => ['sometimes', 'boolean'],
        ];
    }

    public function withValidator(\Illuminate\Validation\Validator $validator): void
    {
        $validator->after(function (\Illuminate\Validation\Validator $validator): void {
            $entry = $this->route('recurringPaymentEntry');

            $frequency  = $this->input('frequency', $entry?->frequency);
            $dayOfMonth = $this->has('day_of_month')
                ? $this->input('day_of_month')
                : $entry?->day_of_month;

            if (in_array($frequency, ['monthly', 'yearly'], true) && is_null($dayOfMonth)) {
                $validator->errors()->add(
                    'day_of_month',
                    'The day of month field is required when frequency is monthly or yearly.'
                );
            }
        });
    }
}
