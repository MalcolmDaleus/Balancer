<?php

namespace App\Http\Requests\Api;

use App\Http\Requests\Api\Concerns\ConvertsAmountCents;
use App\Models\Saving;
use App\Support\MoneyCents;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StoreSavingRequest extends FormRequest
{
    use ConvertsAmountCents;

    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('month') && preg_match('/^\d{4}-\d{2}$/', (string) $this->month)) {
            $this->merge(['month' => $this->month.'-01']);
        }
    }

    public function rules(): array
    {
        return [
            'amount_cents' => MoneyCents::rules(),
            'type' => ['sometimes', 'string', 'in:deposit,withdrawal'],
            'notes' => ['nullable', 'string', 'max:500'],
            'month' => ['required', 'date'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $type = $this->input('type', 'deposit');
            if ($type !== 'withdrawal') {
                return;
            }

            $amount = (int) $this->input('amount_cents', 0);
            $available = Saving::runningBalance(
                $this->user()->id,
                $this->input('month'),
            );

            if ($amount > $available) {
                $validator->errors()->add(
                    'amount_cents',
                    'This is more than you have in savings.'
                );
            }
        });
    }
}
