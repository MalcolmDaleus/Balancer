<?php

namespace App\Http\Requests\Api;

use App\Support\MoneyCents;
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
            'amount_cents' => ['nullable', 'integer', 'min:1', 'max:'.MoneyCents::MAX],
            'refund_date' => ['nullable', 'date'],
        ];
    }
}
