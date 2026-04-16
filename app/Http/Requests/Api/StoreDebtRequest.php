<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreDebtRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'category_id' => ['nullable', 'integer', Rule::exists('debt_categories', 'id')->where('user_id', $this->user()->id)],
            'amount'      => ['required', 'numeric', 'min:0.01', 'max:9999999.99'],
            'description' => ['required', 'string', 'max:255'],
            'issue_date'  => ['required', 'date'],
            'notes'       => ['nullable', 'string', 'max:1000'],
        ];
    }
}
