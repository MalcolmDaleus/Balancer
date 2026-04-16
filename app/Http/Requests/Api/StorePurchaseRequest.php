<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePurchaseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'category_id'          => ['nullable', 'integer', Rule::exists('purchase_categories', 'id')->where('user_id', $this->user()->id)],
            'amount'               => ['required', 'numeric', 'min:0.01', 'max:9999999.99'],
            'description'          => ['required', 'string', 'max:255'],
            'date'                 => ['required', 'date'],
            'attachment_path'      => ['nullable', 'string', 'max:500'],
            'url'                  => ['nullable', 'url', 'max:500'],
            'recurring_purchase_id'=> ['nullable', 'integer', Rule::exists('recurring_purchases', 'id')->where('user_id', $this->user()->id)],
        ];
    }
}
