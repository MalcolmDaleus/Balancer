<?php

namespace App\Http\Requests\Api;

use App\Enums\IncomeEntryType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreIncomeEntryRequest extends FormRequest
{
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
            'type'        => ['required', 'string', Rule::in($types)],
            'name'        => ['required', 'string', 'max:64'],
            'description' => ['nullable', 'string', 'max:255'],
            'amount'      => ['required', 'numeric', 'min:0.01', 'max:9999999.99'],
            'received_at' => ['required', 'date'],
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
            if ($this->input('type') === IncomeEntryType::Irregular->value && $this->filled('regular_schedule_id')) {
                $validator->errors()->add('regular_schedule_id', 'Irregular entries cannot be linked to a schedule.');
            }
        });
    }
}
