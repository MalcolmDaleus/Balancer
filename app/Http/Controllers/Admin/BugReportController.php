<?php

namespace App\Http\Controllers\Admin;

use App\Enums\BugReportStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateBugReportRequest;
use App\Models\BugReport;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class BugReportController extends Controller
{
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', BugReport::class);

        $status = BugReportStatus::tryFrom((string) $request->query('status', ''))?->value;

        $reports = BugReport::query()
            ->with('user:id,first_name,last_name,email')
            ->when($status, fn ($query) => $query->where('status', $status))
            ->latest()
            ->paginate(20)
            ->withQueryString()
            ->through(fn (BugReport $report) => [
                'id' => $report->id,
                'type' => $report->type?->value,
                'zone' => $report->zone?->value,
                'view' => $report->view?->value,
                'status' => $report->status?->value,
                'description' => $report->description,
                'created_at' => $report->created_at?->toIso8601String(),
                'user' => $report->user === null ? null : [
                    'id' => $report->user->id,
                    'name' => trim($report->user->first_name.' '.$report->user->last_name),
                    'email' => $report->user->email,
                ],
            ]);

        return Inertia::render('admin/bug-reports', [
            'reports' => $reports,
            'filters' => [
                'status' => $status,
            ],
        ]);
    }

    public function update(UpdateBugReportRequest $request, BugReport $bugReport): RedirectResponse
    {
        $this->authorize('update', $bugReport);

        $bugReport->update([
            'status' => $request->enum('status', BugReportStatus::class),
        ]);

        return back();
    }
}
