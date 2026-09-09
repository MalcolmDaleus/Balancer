<?php

namespace App\Http\Requests\Api;

use App\Http\Requests\Api\Concerns\ConvertsAmountCents;
use App\Models\Saving;
use App\Support\MoneyCents;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class UpdateSavingRequest extends FormRequest
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
            'amount_cents' => MoneyCents::rules(required: false),
            'type' => ['sometimes', 'string', 'in:deposit,withdrawal'],
            'notes' => ['nullable', 'string', 'max:500'],
            'month' => ['sometimes', 'date'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            /** @var Saving $saving */
            $saving = $this->route('saving');
            $type = $this->input('type', $saving->type);
            if ($type !== 'withdrawal') {
                return;
            }

            $amount = $this->has('amount_cents')
                ? (int) $this->input('amount_cents')
                : MoneyCents::fromMajor($saving->amount);
            $month = $this->input('month', $saving->month?->toDateString());
            $available = Saving::runningBalance(
                $this->user()->id,
                $month,
                $saving->id,
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
