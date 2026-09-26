<?php

namespace App\Enums;

enum BugReportStatus: string
{
    case New = 'new';
    case Triaged = 'triaged';
    case Fixed = 'fixed';
    case WontFix = 'wont_fix';
}
