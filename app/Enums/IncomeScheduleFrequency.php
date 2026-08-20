<?php

namespace App\Enums;

enum IncomeScheduleFrequency: string
{
    case Weekly = 'weekly';
    case Biweekly = 'biweekly';
    case Monthly = 'monthly';
    case Bimonthly = 'bimonthly';
    case Quarterly = 'quarterly';
    case Trimester = 'trimester';
    case Biannually = 'biannually';
    case Annually = 'annually';

    public function usesDayOfWeek(): bool
    {
        return in_array($this, [self::Weekly, self::Biweekly], true);
    }

    public function usesDayOfMonth(): bool
    {
        return ! $this->usesDayOfWeek();
    }

    public function usesAnchorDate(): bool
    {
        return $this === self::Biweekly;
    }

    public function monthInterval(): int
    {
        return match ($this) {
            self::Monthly     => 1,
            self::Bimonthly   => 2,
            self::Quarterly   => 3,
            self::Trimester   => 4,
            self::Biannually  => 6,
            self::Annually    => 12,
            default           => 0,
        };
    }

    /**
     * Map recurring payment frequencies onto schedule frequencies.
     *
     * Accepts RecurringPaymentFrequency or its string value; yearly → annually.
     */
    public static function fromRecurringPayment(string|RecurringPaymentFrequency $frequency): self
    {
        $value = $frequency instanceof RecurringPaymentFrequency
            ? $frequency
            : RecurringPaymentFrequency::tryFrom($frequency);

        return match ($value) {
            RecurringPaymentFrequency::Weekly  => self::Weekly,
            RecurringPaymentFrequency::Monthly => self::Monthly,
            RecurringPaymentFrequency::Yearly  => self::Annually,
            default => throw new \InvalidArgumentException(
                'Unsupported recurring payment frequency: '.($frequency instanceof RecurringPaymentFrequency
                    ? $frequency->value
                    : $frequency),
            ),
        };
    }
}

