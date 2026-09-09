<?php

namespace App\Enums;

enum BudgetEnvelopeDomain: string
{
    case Purchase = 'purchase';
    case Recurring = 'recurring';
}
