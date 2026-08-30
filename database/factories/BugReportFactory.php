<?php

namespace Database\Factories;

use App\Enums\BugReportType;
use App\Enums\BugReportView;
use App\Enums\BugReportZone;
use App\Models\BugReport;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<BugReport>
 */
class BugReportFactory extends Factory
{
    protected $model = BugReport::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'type' => BugReportType::Visual,
            'zone' => BugReportZone::Other,
            'view' => BugReportView::Desktop,
            'description' => fake()->sentence(12),
        ];
    }
}
