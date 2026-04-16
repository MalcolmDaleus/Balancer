<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class RefundPurchaseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'amount'       => ['nullable', 'numeric', 'min:0.01', 'max:9999999.99'],
            'refund_date'  => ['nullable', 'date'],
        ];
    }
}
