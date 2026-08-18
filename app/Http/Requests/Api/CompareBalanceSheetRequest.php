<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class CompareBalanceSheetRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'month_a' => ['required', 'date_format:Y-m'],
            'month_b' => ['required', 'date_format:Y-m'],
        ];
    }
}
