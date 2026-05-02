<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateRecurringPaymentPriceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'amount'       => ['required', 'numeric', 'min:0.01', 'max:9999999.99'],
            'start_date'   => ['required', 'date'],
            'frequency'    => ['sometimes', 'string', Rule::in(['weekly', 'monthly', 'yearly'])],
            'day_of_month' => ['nullable', 'integer', 'min:1', 'max:31'],
            'day_of_week'  => ['nullable', 'integer', 'min:0', 'max:6'],
        ];
    }
}
