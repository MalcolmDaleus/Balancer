<?php

namespace App\Enums;

enum RecurringPaymentFrequency: string
{
    case Weekly = 'weekly';
    case Monthly = 'monthly';
    case Yearly = 'yearly';

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }

    public function usesDayOfWeek(): bool
    {
        return $this === self::Weekly;
    }

    public function usesDayOfMonth(): bool
    {
        return in_array($this, [self::Monthly, self::Yearly], true);
    }
}
