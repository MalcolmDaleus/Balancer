<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\BugReport;
use App\Models\User;
use Inertia\Inertia;
use Inertia\Response;

class OverviewController extends Controller
{
    public function __invoke(): Response
    {
        $this->authorize('viewAny', BugReport::class);

        return Inertia::render('admin/overview', [
            'stats' => [
                'users' => User::query()->count(),
                'admins' => User::query()->where('is_admin', true)->count(),
                'bug_reports' => BugReport::query()->count(),
                'new_bug_reports' => BugReport::query()->where('status', 'new')->count(),
            ],
            'recent_reports' => BugReport::query()
                ->with('user:id,first_name,last_name,email')
                ->latest()
                ->limit(5)
                ->get()
                ->map(fn (BugReport $report) => $this->reportRow($report))
                ->values(),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function reportRow(BugReport $report): array
    {
        return [
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
        ];
    }
}
