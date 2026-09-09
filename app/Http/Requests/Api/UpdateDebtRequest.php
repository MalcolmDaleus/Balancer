<?php

namespace App\Http\Requests\Api;

use App\Http\Requests\Api\Concerns\ConvertsAmountCents;
use App\Models\Debt;
use App\Support\MoneyCents;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class UpdateDebtRequest extends FormRequest
{
    use ConvertsAmountCents;

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'category_id' => ['sometimes', 'nullable', 'integer', Rule::exists('debt_categories', 'id')->where('user_id', $this->user()->id)],
            'amount_cents' => MoneyCents::rules(required: false),
            'description' => ['sometimes', 'string', 'max:255'],
            'issue_date' => ['sometimes', 'date'],
            'notes' => ['sometimes', 'nullable', 'string', 'max:1000'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            if (! $this->filled('amount_cents')) {
                return;
            }

            /** @var Debt $debt */
            $debt = $this->route('debt');
            $paid = MoneyCents::fromMajor($debt->payments()->sum('amount'));
            $amount = (int) $this->input('amount_cents');

            if ($amount < $paid) {
                $validator->errors()->add(
                    'amount_cents',
                    'Debt amount cannot be less than the total of recorded payments ('.MoneyCents::toMajorString($paid).').'
                );
            }
        });
    }
}
