<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdatePurchaseCategoryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if (! $this->filled('name') && $this->filled('category_name')) {
            $this->merge(['name' => $this->input('category_name')]);
        }
    }

    public function rules(): array
    {
        $categoryId = $this->route('purchaseCategory')?->id;

        return [
            'name' => [
                'required',
                'string',
                'max:64',
                Rule::unique('purchase_categories', 'name')
                    ->where(fn ($q) => $q->where('user_id', $this->user()->id)->whereNull('deleted_at'))
                    ->ignore($categoryId),
            ],
        ];
    }
}
