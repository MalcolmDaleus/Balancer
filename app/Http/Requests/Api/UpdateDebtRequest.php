<?php

namespace App\Http\Requests\Api;

use App\Models\Debt;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class UpdateDebtRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'category_id' => ['sometimes', 'nullable', 'integer', Rule::exists('debt_categories', 'id')->where('user_id', $this->user()->id)],
            'amount'      => ['sometimes', 'numeric', 'min:0.01', 'max:9999999.99'],
            'description' => ['sometimes', 'string', 'max:255'],
            'issue_date'  => ['sometimes', 'date'],
            'notes'       => ['sometimes', 'nullable', 'string', 'max:1000'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            if (! $this->filled('amount')) {
                return;
            }

            /** @var Debt $debt */
            $debt = $this->route('debt');
            $paid = (float) $debt->payments()->sum('amount');
            $amount = (float) $this->input('amount');

            if ($amount + 0.00001 < $paid) {
                $validator->errors()->add(
                    'amount',
                    'Debt amount cannot be less than the total of recorded payments ('.number_format($paid, 2, '.', '').').'
                );
            }
        });
    }
}
