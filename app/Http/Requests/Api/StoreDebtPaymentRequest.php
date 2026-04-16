<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class StoreDebtPaymentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'amount'  => ['required', 'numeric', 'min:0.01', 'max:9999999.99'],
            'paid_at' => ['required', 'date'],
            'notes'   => ['nullable', 'string', 'max:1000'],
        ];
    }
}
