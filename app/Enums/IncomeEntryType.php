<?php

namespace App\Enums;

enum IncomeEntryType: string
{
    case Regular = 'regular';
    case Irregular = 'irregular';
    case Refund = 'refund';
}
