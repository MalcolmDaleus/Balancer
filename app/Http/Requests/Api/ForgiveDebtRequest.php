<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class ForgiveDebtRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'forgive_date' => ['nullable', 'date'],
            'notes'        => ['nullable', 'string', 'max:1000'],
        ];
    }
}
