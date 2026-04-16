<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreIncomeEntryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('month') && preg_match('/^\d{4}-\d{2}$/', (string) $this->month)) {
            $this->merge(['month' => $this->month . '-01']);
        }
    }

    public function rules(): array
    {
        return [
            'income_stream_id' => ['required', 'integer', Rule::exists('income_streams', 'id')->where('user_id', $this->user()->id)],
            'amount'           => ['required', 'numeric', 'min:0.01', 'max:9999999.99'],
            'month'            => ['required', 'date'],
        ];
    }
}
