<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreRecurringPaymentCategoryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => [
                'required',
                'string',
                'max:64',
                Rule::unique('recurring_payment_categories', 'name')
                    ->where(fn ($q) => $q->where('user_id', $this->user()->id)->whereNull('deleted_at')),
            ],
        ];
    }
}
