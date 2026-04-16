<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateRecurringPaymentStreamRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'recurring_payment_category_id' => [
                'sometimes',
                'nullable',
                'integer',
                Rule::exists('recurring_payment_categories', 'id')->where('user_id', $this->user()->id),
            ],
            'name'        => ['sometimes', 'string', 'max:64'],
            'description' => ['sometimes', 'nullable', 'string', 'max:255'],
        ];
    }
}
