<?php

namespace App\Http\Requests\Api;

use App\Http\Requests\Api\Concerns\ConvertsAmountCents;
use App\Support\MoneyCents;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreDebtRequest extends FormRequest
{
    use ConvertsAmountCents;

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'category_id' => ['nullable', 'integer', Rule::exists('debt_categories', 'id')->where('user_id', $this->user()->id)],
            'amount_cents' => MoneyCents::rules(),
            'description' => ['required', 'string', 'max:255'],
            'issue_date' => ['required', 'date'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
