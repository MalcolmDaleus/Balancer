<?php

namespace App\Http\Requests\Api;

use App\Enums\BugReportType;
use App\Enums\BugReportView;
use App\Enums\BugReportZone;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreBugReportRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'type' => ['required', Rule::enum(BugReportType::class)],
            'zone' => ['required', Rule::enum(BugReportZone::class)],
            'view' => ['required', Rule::enum(BugReportView::class)],
            'description' => ['required', 'string', 'min:10', 'max:5000'],
        ];
    }
}
