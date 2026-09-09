<?php

namespace App\Http\Requests\Api;

use App\Enums\IncomeScheduleFrequency;
use App\Http\Requests\Api\Concerns\ConvertsAmountCents;
use App\Support\MoneyCents;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreRegularIncomeScheduleRequest extends FormRequest
{
    use ConvertsAmountCents;

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $frequencies = array_column(IncomeScheduleFrequency::cases(), 'value');

        return [
            'name' => ['required', 'string', 'max:64'],
            'description' => ['nullable', 'string', 'max:255'],
            'amount_cents' => MoneyCents::rules(),
            'frequency' => ['required', 'string', Rule::in($frequencies)],
            'day_of_month' => ['nullable', 'integer', 'min:1', 'max:31'],
            'day_of_week' => ['nullable', 'integer', 'min:0', 'max:6'],
            'anchor_date' => ['nullable', 'date'],
            'start_date' => ['required', 'date'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $frequency = $this->input('frequency');

            if (! $frequency) {
                return;
            }

            try {
                $enum = IncomeScheduleFrequency::from($frequency);
            } catch (\ValueError) {
                return;
            }

            if ($enum->usesDayOfWeek() && $this->input('day_of_week') === null) {
                $validator->errors()->add('day_of_week', 'Day of week is required for this frequency.');
            }

            if ($enum->usesDayOfMonth() && $this->input('day_of_month') === null) {
                $validator->errors()->add('day_of_month', 'Day of month is required for this frequency.');
            }

            if ($enum->usesAnchorDate() && $this->input('anchor_date') === null) {
                $validator->errors()->add('anchor_date', 'Anchor date is required for biweekly schedules.');
            }
        });
    }
}
