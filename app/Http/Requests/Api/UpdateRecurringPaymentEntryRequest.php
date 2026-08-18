<?php

namespace App\Http\Requests\Api;

use App\Enums\RecurringPaymentFrequency;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

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
            'frequency'    => ['sometimes', 'string', Rule::in(RecurringPaymentFrequency::values())],
            'day_of_month' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:31'],
            'day_of_week'  => ['sometimes', 'nullable', 'integer', 'min:0', 'max:6'],
            'start_date'   => ['sometimes', 'date'],
            'end_date'     => ['sometimes', 'nullable', 'date'],
            'active'       => ['sometimes', 'boolean'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $entry = $this->route('recurringPaymentEntry');

            $frequencyValue = $this->input('frequency', $entry?->frequency);
            $frequency = is_string($frequencyValue)
                ? RecurringPaymentFrequency::tryFrom($frequencyValue)
                : null;

            $dayOfMonth = $this->has('day_of_month')
                ? $this->input('day_of_month')
                : $entry?->day_of_month;
            $dayOfWeek = $this->has('day_of_week')
                ? $this->input('day_of_week')
                : $entry?->day_of_week;

            if ($frequency === null) {
                return;
            }

            if ($frequency->usesDayOfWeek() && $dayOfWeek === null) {
                $validator->errors()->add('day_of_week', 'Day of week is required for weekly frequency.');
            }

            if ($frequency->usesDayOfMonth() && is_null($dayOfMonth)) {
                $validator->errors()->add(
                    'day_of_month',
                    'The day of month field is required when frequency is monthly or yearly.'
                );
            }
        });
    }
}
