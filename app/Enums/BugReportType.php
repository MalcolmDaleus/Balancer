<?php

namespace App\Enums;

enum BugReportType: string
{
    case Visual = 'visual';
    case Functional = 'functional';
    case Composite = 'composite';
}
