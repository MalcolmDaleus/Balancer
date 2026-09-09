<?php

namespace App\Support;

/**
 * Integer minor-unit math (cents). Facts still persist as decimal(12,2) majors;
 * convert at the DB/API boundary. Do not use IEEE floats for money arithmetic.
 */
final class MoneyCents
{
    public const MAX = 999_999_999;

    /**
     * Major units (12.34 or "12.34") → cents. Extra fractional digits half-up.
     * Integers are treated as whole major units (€50 → 5000).
     */
    public static function fromMajor(int|float|string|null $major): int
    {
        if ($major === null || $major === '') {
            return 0;
        }

        if (is_int($major)) {
            return $major * 100;
        }

        if (is_float($major)) {
            $sign = $major < 0 ? -1 : 1;

            return $sign * (int) round(abs($major) * 100, 0);
        }

        $s = trim((string) $major);
        $sign = 1;
        if (str_starts_with($s, '-')) {
            $sign = -1;
            $s = substr($s, 1);
        } elseif (str_starts_with($s, '+')) {
            $s = substr($s, 1);
        }

        if ($s === '' || ! is_numeric($s)) {
            return 0;
        }

        if (! str_contains($s, '.')) {
            return $sign * ((int) $s) * 100;
        }

        [$whole, $frac] = explode('.', $s, 2);
        $wholeN = $whole === '' ? 0 : (int) $whole;

        if (strlen($frac) <= 2) {
            return $sign * ($wholeN * 100 + (int) str_pad($frac, 2, '0'));
        }

        $cents = $wholeN * 100 + (int) substr($frac, 0, 2);
        if ((int) $frac[2] >= 5) {
            $cents++;
        }

        return $sign * $cents;
    }

    /** Exact decimal string for writing decimal(12,2) columns. */
    public static function toMajorString(int $cents): string
    {
        $sign = $cents < 0 ? '-' : '';
        $abs = abs($cents);

        return $sign.intdiv($abs, 100).'.'.str_pad((string) ($abs % 100), 2, '0', STR_PAD_LEFT);
    }

    /** Display / chart bridge only. Prefer toMajorString for storage. */
    public static function toMajor(int $cents): float
    {
        return round($cents / 100, 2);
    }

    public static function add(int ...$parts): int
    {
        $total = 0;
        foreach ($parts as $part) {
            $total += $part;
        }

        return $total;
    }

    public static function subtract(int $a, int $b): int
    {
        return $a - $b;
    }

    /**
     * @param  iterable<int|float|string|null>  $majors
     */
    public static function sumMajors(iterable $majors): int
    {
        $total = 0;
        foreach ($majors as $major) {
            $total += self::fromMajor($major);
        }

        return $total;
    }

    /**
     * Replace amount_cents on a validated payload with amount as a decimal string.
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public static function takeCents(array $data, string $from = 'amount_cents', string $to = 'amount'): array
    {
        if (! array_key_exists($from, $data)) {
            return $data;
        }

        $cents = $data[$from];
        unset($data[$from]);

        if ($cents !== null && $cents !== '') {
            $data[$to] = self::toMajorString((int) $cents);
        }

        return $data;
    }

    /**
     * @return list<string>
     */
    public static function rules(bool $required = true, bool $allowZero = false): array
    {
        $min = $allowZero ? 0 : 1;
        $base = ['integer', "min:{$min}", 'max:'.self::MAX];

        return $required ? ['required', ...$base] : ['sometimes', ...$base];
    }
}
