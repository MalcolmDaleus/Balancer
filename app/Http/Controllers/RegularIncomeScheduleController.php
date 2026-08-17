<?php

namespace App\Http\Controllers;

use App\Http\Requests\Api\StoreRegularIncomeScheduleRequest;
use App\Http\Requests\Api\UpdateRegularIncomeScheduleAmountRequest;
use App\Http\Requests\Api\UpdateRegularIncomeScheduleRequest;
use App\Http\Resources\RegularIncomeScheduleResource;
use App\Models\BalanceSheetTotal;
use App\Models\IncomeEntry;
use App\Models\RegularIncomeSchedule;
use App\Models\RegularIncomeScheduleVersion;
use App\Services\MonthLockService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;

class RegularIncomeScheduleController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        $this->authorize('viewAny', RegularIncomeSchedule::class);

        $archived = request()->boolean('archived');

        $query = $archived
            ? RegularIncomeSchedule::onlyTrashed()->where('user_id', auth()->id())
            : RegularIncomeSchedule::where('user_id', auth()->id());

        $schedules = $query
            ->with(['versions' => fn ($q) => $q->orderByDesc('start_date')])
            ->orderBy('name')
            ->get();

        return RegularIncomeScheduleResource::collection($schedules);
    }

    public function store(StoreRegularIncomeScheduleRequest $request): RegularIncomeScheduleResource
    {
        $this->authorize('create', RegularIncomeSchedule::class);

        $data = $request->validated();

        $schedule = DB::transaction(function () use ($data) {
            $schedule = RegularIncomeSchedule::create([
                'user_id'     => auth()->id(),
                'name'        => $data['name'],
                'description' => $data['description'] ?? null,
                'active'      => true,
            ]);

            RegularIncomeScheduleVersion::create([
                'user_id'             => $schedule->user_id,
                'regular_schedule_id' => $schedule->id,
                'amount'              => $data['amount'],
                'frequency'           => $data['frequency'],
                'day_of_month'        => $data['day_of_month'] ?? null,
                'day_of_week'         => $data['day_of_week'] ?? null,
                'anchor_date'         => $data['anchor_date'] ?? null,
                'start_date'          => $data['start_date'],
                'end_date'            => null,
                'active'              => true,
            ]);

            return $schedule;
        });

        $schedule->refresh();

        return new RegularIncomeScheduleResource(
            $schedule->load(['versions' => fn ($q) => $q->orderByDesc('start_date')])
        );
    }

    public function show(RegularIncomeSchedule $regularIncomeSchedule): RegularIncomeScheduleResource
    {
        $this->authorize('view', $regularIncomeSchedule);

        return new RegularIncomeScheduleResource(
            $regularIncomeSchedule->load(['versions' => fn ($q) => $q->orderByDesc('start_date')])
        );
    }

    public function update(UpdateRegularIncomeScheduleRequest $request, RegularIncomeSchedule $regularIncomeSchedule): RegularIncomeScheduleResource
    {
        $this->authorize('update', $regularIncomeSchedule);

        $data = $request->validated();
        $regularIncomeSchedule->update($data);

        if (array_key_exists('name', $data) || array_key_exists('description', $data)) {
            $this->propagateNameToOpenMonthEntries($regularIncomeSchedule);
        }

        return new RegularIncomeScheduleResource(
            $regularIncomeSchedule->fresh()->load(['versions' => fn ($q) => $q->orderByDesc('start_date')])
        );
    }

    public function updateAmount(
        UpdateRegularIncomeScheduleAmountRequest $request,
        RegularIncomeSchedule $regularIncomeSchedule,
    ): RegularIncomeScheduleResource {
        $this->authorize('update', $regularIncomeSchedule);

        $data = $request->validated();
        $startDate = Carbon::parse($data['start_date']);

        DB::transaction(function () use ($regularIncomeSchedule, $data, $startDate) {
            $regularIncomeSchedule->versions()
                ->where('active', true)
                ->where(function ($q) use ($startDate) {
                    $q->whereNull('end_date')
                      ->orWhere('end_date', '>=', $startDate->toDateString());
                })
                ->update([
                    'active'   => false,
                    'end_date' => $startDate->copy()->subDay()->toDateString(),
                ]);

            $previous = $regularIncomeSchedule->versions()
                ->orderByDesc('start_date')
                ->first();

            RegularIncomeScheduleVersion::create([
                'user_id'             => $regularIncomeSchedule->user_id,
                'regular_schedule_id' => $regularIncomeSchedule->id,
                'amount'              => $data['amount'],
                'frequency'           => $data['frequency'] ?? $previous?->frequency ?? 'monthly',
                'day_of_month'        => $data['day_of_month'] ?? $previous?->day_of_month,
                'day_of_week'         => $data['day_of_week'] ?? $previous?->day_of_week,
                'anchor_date'         => $data['anchor_date'] ?? $previous?->anchor_date,
                'start_date'          => $startDate->toDateString(),
                'end_date'            => null,
                'active'              => true,
            ]);
        });

        return new RegularIncomeScheduleResource(
            $regularIncomeSchedule->fresh()->load(['versions' => fn ($q) => $q->orderByDesc('start_date')])
        );
    }

    public function toggle(RegularIncomeSchedule $regularIncomeSchedule): RegularIncomeScheduleResource
    {
        $this->authorize('update', $regularIncomeSchedule);

        if ($regularIncomeSchedule->pending_active !== null) {
            $regularIncomeSchedule->update(['pending_active' => null]);
        } else {
            $regularIncomeSchedule->update(['pending_active' => ! $regularIncomeSchedule->active]);
        }

        return new RegularIncomeScheduleResource(
            $regularIncomeSchedule->fresh()->load(['versions' => fn ($q) => $q->orderByDesc('start_date')])
        );
    }

    public function destroy(RegularIncomeSchedule $regularIncomeSchedule): JsonResponse
    {
        $this->authorize('delete', $regularIncomeSchedule);

        $regularIncomeSchedule->delete();

        return response()->json(null, 204);
    }

    public function restore(int $regularIncomeSchedule): RegularIncomeScheduleResource
    {
        $schedule = RegularIncomeSchedule::withTrashed()
            ->where('user_id', auth()->id())
            ->findOrFail($regularIncomeSchedule);

        $this->authorize('restore', $schedule);

        $schedule->restore();

        return new RegularIncomeScheduleResource(
            $schedule->fresh()->load(['versions' => fn ($q) => $q->orderByDesc('start_date')])
        );
    }

    public function hardDestroy(int $regularIncomeSchedule): JsonResponse
    {
        $schedule = RegularIncomeSchedule::withTrashed()
            ->where('user_id', auth()->id())
            ->findOrFail($regularIncomeSchedule);

        $this->authorize('delete', $schedule);

        $latestLocked = BalanceSheetTotal::where('user_id', $schedule->user_id)->max('month');

        if ($latestLocked) {
            $latestLockedEnd = Carbon::parse($latestLocked)->endOfMonth()->toDateString();
            $hasLockedEntries = $schedule->entries()
                ->whereDate('received_at', '<=', $latestLockedEnd)
                ->exists();

            if ($hasLockedEntries) {
                return response()->json([
                    'error'   => 'locked_month',
                    'message' => 'This schedule has appeared in a closed balance sheet and cannot be permanently deleted.',
                ], 423);
            }
        }

        $schedule->forceDelete();

        return response()->json(null, 204);
    }

    /**
     * Propagate schedule name/description to regular entries in open months only.
     */
    private function propagateNameToOpenMonthEntries(RegularIncomeSchedule $schedule): void
    {
        $entries = IncomeEntry::where('user_id', $schedule->user_id)
            ->where('regular_schedule_id', $schedule->id)
            ->where('type', 'regular')
            ->get();

        foreach ($entries as $entry) {
            if (MonthLockService::isLocked($schedule->user_id, $entry->received_at)) {
                continue;
            }

            $entry->update([
                'name'        => $schedule->name,
                'description' => $schedule->description,
            ]);
        }
    }
}
