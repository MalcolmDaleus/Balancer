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
            'settle_date' => [
                'sometimes',
                'nullable',
                'date',
                function (string $attribute, mixed $value, \Closure $fail): void {
                    if ($value === null) {
                        return;
                    }
                    // Use the new issue_date if provided, otherwise fall back to the existing one.
                    $issueDate = $this->input('issue_date')
                        ?? $this->route('debt')?->issue_date?->toDateString();

                    if ($issueDate && strtotime($value) < strtotime($issueDate)) {
                        $fail('The settle date must be a date after or equal to the issue date.');
                    }
                },
            ],
            'notes'       => ['sometimes', 'nullable', 'string', 'max:1000'],
        ];
    }
}
