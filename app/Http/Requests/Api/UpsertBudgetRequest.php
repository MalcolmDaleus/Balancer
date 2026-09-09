<?php

namespace App\Http\Requests\Api;

use App\Enums\BudgetEnvelopeDomain;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpsertBudgetRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('month') && preg_match('/^\d{4}-\d{2}$/', (string) $this->month)) {
            $this->merge(['month' => $this->month]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $cents = ['integer', 'min:0', 'max:999999999'];

        return [
            'month' => ['sometimes', 'nullable', 'date_format:Y-m'],
            'discretionary_cents' => ['required', ...$cents],
            'bills_cents' => ['sometimes', 'nullable', ...$cents],
            'debt_payment_cents' => ['sometimes', 'nullable', ...$cents],
            'save_cents' => ['sometimes', 'nullable', ...$cents],
            'envelopes' => ['sometimes', 'array'],
            'envelopes.*.domain' => ['required', Rule::enum(BudgetEnvelopeDomain::class)],
            'envelopes.*.category_id' => ['required', 'integer', 'min:1'],
            'envelopes.*.amount_cents' => ['required', ...$cents],
        ];
    }
}
