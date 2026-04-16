<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

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
}
