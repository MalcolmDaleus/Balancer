<?php

namespace App\Http\Requests\Settings;

use App\Models\User;
use App\Support\SupportedLocales;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ProfileUpdateRequest extends FormRequest
{
    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'first_name' => ['required', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'string',
                'lowercase',
                'email',
                'max:255',
                Rule::unique(User::class)->ignore($this->user()->id),
            ],
            'currency' => ['required', 'string', Rule::in(['USD', 'EUR'])],
            'locale' => ['nullable', 'string', Rule::in(SupportedLocales::keys())],
        ];
    }

    protected function prepareForValidation(): void
    {
        if ($this->input('locale') === '') {
            $this->merge(['locale' => null]);
        }
    }
}
