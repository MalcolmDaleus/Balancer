<?php

namespace App\Http\Requests\Api;

use App\Enums\IncomeEntryType;
use App\Http\Requests\Api\Concerns\ConvertsAmountCents;
use App\Support\MoneyCents;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class UpdateIncomeEntryRequest extends FormRequest
{
    use ConvertsAmountCents;

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $types = [
            IncomeEntryType::Regular->value,
            IncomeEntryType::Irregular->value,
        ];

        return [
            'type' => ['sometimes', 'string', Rule::in($types)],
            'name' => ['sometimes', 'string', 'max:64'],
            'description' => ['nullable', 'string', 'max:255'],
            'amount_cents' => MoneyCents::rules(required: false),
            'received_at' => ['sometimes', 'date'],
            'regular_schedule_id' => [
                'nullable',
                'integer',
                Rule::exists('regular_income_schedules', 'id')->where('user_id', $this->user()->id),
            ],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $entry = $this->route('incomeEntry');

            if ($entry && $entry->type === IncomeEntryType::Refund) {
                $validator->errors()->add('type', 'Refund entries cannot be edited.');
            }

            if ($this->input('type') === IncomeEntryType::Irregular->value && $this->filled('regular_schedule_id')) {
                $validator->errors()->add('regular_schedule_id', 'Irregular entries cannot be linked to a schedule.');
            }
        });
    }
}
