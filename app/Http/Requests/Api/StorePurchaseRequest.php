<?php

namespace App\Http\Requests\Api;

use App\Http\Requests\Api\Concerns\ConvertsAmountCents;
use App\Support\MoneyCents;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePurchaseRequest extends FormRequest
{
    use ConvertsAmountCents;

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'category_id' => ['required', 'integer', Rule::exists('purchase_categories', 'id')->where('user_id', $this->user()->id)],
            'amount_cents' => MoneyCents::rules(),
            'description' => ['required', 'string', 'max:255'],
            'date' => ['required', 'date'],
            'attachment_path' => ['nullable', 'string', 'max:500'],
            'url' => ['nullable', 'url', 'max:500'],
        ];
    }
}
