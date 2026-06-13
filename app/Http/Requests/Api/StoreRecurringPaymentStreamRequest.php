<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreRecurringPaymentStreamRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'recurring_payment_category_id' => [
                'nullable',
                'integer',
                Rule::exists('recurring_payment_categories', 'id')->where('user_id', $this->user()->id),
            ],
            'name'        => ['required', 'string', 'max:64'],
            'description' => ['nullable', 'string', 'max:255'],
            'amount'       => ['required', 'numeric', 'min:0.01', 'max:9999999.99'],
            'frequency'    => ['required', 'string', Rule::in(['monthly', 'yearly'])],
            'day_of_month' => ['required', 'integer', 'min:1', 'max:31'],
            'start_date'   => ['required', 'date'],
        ];
    }
}
