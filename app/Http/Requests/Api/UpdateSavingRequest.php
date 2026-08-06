<?php

namespace App\Http\Requests\Api;

use App\Models\Saving;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class UpdateSavingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('month') && preg_match('/^\d{4}-\d{2}$/', (string) $this->month)) {
            $this->merge(['month' => $this->month . '-01']);
        }
    }

    public function rules(): array
    {
        return [
            'amount' => ['sometimes', 'numeric', 'min:0.01', 'max:9999999.99'],
            'type'   => ['sometimes', 'string', 'in:deposit,withdrawal'],
            'notes'  => ['nullable', 'string', 'max:500'],
            'month'  => ['sometimes', 'date'],
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

            $amount = (float) $this->input('amount', $saving->amount);
            $month = $this->input('month', $saving->month?->toDateString());
            $available = Saving::runningBalance(
                $this->user()->id,
                $month,
                $saving->id,
            );

            if ($amount > round($available, 2)) {
                $validator->errors()->add(
                    'amount',
                    'This is more than you have in savings.'
                );
            }
        });
    }
}
