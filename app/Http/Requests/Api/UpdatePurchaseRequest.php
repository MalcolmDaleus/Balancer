<?php

namespace App\Http\Requests\Api;

use App\Http\Requests\Api\Concerns\ConvertsAmountCents;
use App\Support\MoneyCents;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdatePurchaseRequest extends FormRequest
{
    use ConvertsAmountCents;

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'category_id' => ['sometimes', 'integer', Rule::exists('purchase_categories', 'id')->where('user_id', $this->user()->id)],
            'amount_cents' => MoneyCents::rules(required: false),
            'description' => ['sometimes', 'string', 'max:255'],
            'date' => ['sometimes', 'date'],
            'attachment_path' => ['sometimes', 'nullable', 'string', 'max:500'],
            'url' => ['sometimes', 'nullable', 'url', 'max:500'],
        ];
    }
}
