<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class LedgerFeedRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'from' => ['sometimes', 'nullable', 'date'],
            'to' => ['sometimes', 'nullable', 'date', 'after_or_equal:from'],
            'q' => ['sometimes', 'nullable', 'string', 'max:200'],
            'domain' => ['sometimes', 'nullable', Rule::in([
                'income',
                'spending',
                'recurring',
                'debt',
                'savings',
            ])],
            'amount_min_cents' => ['sometimes', 'nullable', 'integer', 'min:0'],
            'amount_max_cents' => ['sometimes', 'nullable', 'integer', 'min:0', 'gte:amount_min_cents'],
        ];
    }
}
