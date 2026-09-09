<?php

namespace App\Http\Requests\Api;

use App\Http\Requests\Api\Concerns\ConvertsAmountCents;
use App\Support\MoneyCents;
use Illuminate\Foundation\Http\FormRequest;

class StoreDebtPaymentRequest extends FormRequest
{
    use ConvertsAmountCents;

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'amount_cents' => MoneyCents::rules(),
            'paid_at' => ['required', 'date'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
