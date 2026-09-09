<?php

namespace App\Http\Requests\Api;

use App\Http\Requests\Api\Concerns\ConvertsAmountCents;
use App\Support\MoneyCents;
use Illuminate\Foundation\Http\FormRequest;

class UpdateDebtPaymentRequest extends FormRequest
{
    use ConvertsAmountCents;

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'amount_cents' => MoneyCents::rules(required: false),
            'paid_at' => ['sometimes', 'date'],
            'notes' => ['sometimes', 'nullable', 'string', 'max:1000'],
        ];
    }
}
