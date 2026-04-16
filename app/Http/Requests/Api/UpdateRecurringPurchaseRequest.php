<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateRecurringPurchaseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'category_id'  => ['sometimes', 'nullable', 'integer', Rule::exists('purchase_categories', 'id')->where('user_id', $this->user()->id)],
            'amount'       => ['sometimes', 'numeric', 'min:0.01', 'max:9999999.99'],
            'description'  => ['sometimes', 'string', 'max:255'],
            'frequency'    => ['sometimes', 'string', Rule::in(['weekly', 'monthly', 'yearly'])],
            'day_of_month' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:31'],
            'day_of_week'  => ['sometimes', 'nullable', 'integer', 'min:0', 'max:6'],
            'start_date'   => ['sometimes', 'date'],
            'end_date'     => ['sometimes', 'nullable', 'date'],
            'active'       => ['sometimes', 'boolean'],
        ];
    }

    /**
     * Cross-field consistency check: validate the combined (merged) state of
     * frequency + day fields so a partial update can't leave the record broken.
     */
    public function withValidator(\Illuminate\Validation\Validator $validator): void
    {
        $validator->after(function (\Illuminate\Validation\Validator $validator): void {
            $rp = $this->route('recurringPurchase');

            // Determine the effective values after merging input with existing model.
            $frequency   = $this->input('frequency',    $rp?->frequency);
            $dayOfMonth  = $this->has('day_of_month')
                ? $this->input('day_of_month')
                : $rp?->day_of_month;
            $dayOfWeek   = $this->has('day_of_week')
                ? $this->input('day_of_week')
                : $rp?->day_of_week;

            if (in_array($frequency, ['monthly', 'yearly'], true) && is_null($dayOfMonth)) {
                $validator->errors()->add(
                    'day_of_month',
                    'The day of month field is required when frequency is monthly or yearly.'
                );
            }

            if ($frequency === 'weekly' && is_null($dayOfWeek)) {
                $validator->errors()->add(
                    'day_of_week',
                    'The day of week field is required when frequency is weekly.'
                );
            }
        });
    }
}
