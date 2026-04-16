<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreRecurringPaymentEntryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'recurring_payment_stream_id' => [
                'required',
                'integer',
                Rule::exists('recurring_payment_streams', 'id')->where('user_id', $this->user()->id),
            ],
            'amount'       => ['required', 'numeric', 'min:0.01', 'max:9999999.99'],
            'frequency'    => ['required', 'string', Rule::in(['weekly', 'monthly', 'yearly'])],
            'day_of_month' => ['nullable', 'integer', 'min:1', 'max:31', 'required_if:frequency,monthly,yearly'],
            'day_of_week'  => ['nullable', 'integer', 'min:0', 'max:6',  'required_if:frequency,weekly'],
            'start_date'   => ['required', 'date'],
            'end_date'     => ['nullable', 'date', 'after_or_equal:start_date'],
            'active'       => ['sometimes', 'boolean'],
        ];
    }
}
