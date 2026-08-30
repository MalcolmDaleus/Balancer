<?php

namespace App\Enums;

enum BugReportZone: string
{
    case BalanceSheet = 'balance-sheet';
    case CreatorSuite = 'creator-suite';
    case Statistics = 'statistics';
    case PastBalanceSheets = 'past-balance-sheets';
    case Settings = 'settings';
    case Dashboard = 'dashboard';
    case Login = 'login';
    case Other = 'other';
}
