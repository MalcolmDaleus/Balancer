<?php

namespace App\Models;

use App\Enums\BugReportType;
use App\Enums\BugReportView;
use App\Enums\BugReportZone;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BugReport extends Model
{
    /** @use HasFactory<\Database\Factories\BugReportFactory> */
    use HasFactory;

    protected $fillable = [
        'user_id',
        'type',
        'zone',
        'view',
        'description',
    ];

    protected function casts(): array
    {
        return [
            'type' => BugReportType::class,
            'zone' => BugReportZone::class,
            'view' => BugReportView::class,
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
