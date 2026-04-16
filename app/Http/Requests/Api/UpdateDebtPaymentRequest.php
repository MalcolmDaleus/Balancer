<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class UpdateDebtPaymentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'amount'  => ['sometimes', 'numeric', 'min:0.01', 'max:9999999.99'],
            'paid_at' => ['sometimes', 'date'],
            'notes'   => ['sometimes', 'nullable', 'string', 'max:1000'],
        ];
    }
}
