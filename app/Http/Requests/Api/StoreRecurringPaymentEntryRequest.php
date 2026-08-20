<?php

namespace App\Http\Requests\Api;

use App\Enums\RecurringPaymentFrequency;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

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
            'frequency'    => ['required', 'string', Rule::in(RecurringPaymentFrequency::values())],
            'day_of_month' => ['nullable', 'integer', 'min:1', 'max:31'],
            'day_of_week'  => ['nullable', 'integer', 'min:0', 'max:6'],
            'start_date'   => ['required', 'date'],
            'end_date'     => ['nullable', 'date', 'after_or_equal:start_date'],
            'active'       => ['sometimes', 'boolean'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $freq = RecurringPaymentFrequency::tryFrom((string) $this->input('frequency'));

            if ($freq?->usesDayOfWeek() && $this->input('day_of_week') === null) {
                $validator->errors()->add('day_of_week', 'Day of week is required for weekly frequency.');
            }

            if ($freq?->usesDayOfMonth() && $this->input('day_of_month') === null) {
                $validator->errors()->add(
                    'day_of_month',
                    'The day of month field is required when frequency is monthly or yearly.'
                );
            }
        });
    }
}
