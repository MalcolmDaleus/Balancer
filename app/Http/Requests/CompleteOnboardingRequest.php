<?php

namespace App\Http\Requests;

use App\Support\MoneyCents;
use Illuminate\Foundation\Http\FormRequest;

class CompleteOnboardingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'liquidity_cents' => MoneyCents::rules(allowZero: true),
            'savings_cents' => MoneyCents::rules(allowZero: true),
            'discretionary_cents' => MoneyCents::rules(required: false, allowZero: true),
        ];
    }
}
