<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

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

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $frequency = $this->input('frequency');
            if ($frequency === null) {
                return;
            }

            if ($frequency === 'weekly' && $this->input('day_of_week') === null) {
                $validator->errors()->add('day_of_week', 'Day of week is required for weekly frequency.');
            }

            if (in_array($frequency, ['monthly', 'yearly'], true) && $this->input('day_of_month') === null) {
                $validator->errors()->add(
                    'day_of_month',
                    'The day of month field is required when frequency is monthly or yearly.'
                );
            }
        });
    }
}
