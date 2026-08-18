<?php

namespace App\Support;

class SupportedLocales
{
    /**
     * Curated locale => human label (with a short number-format example).
     *
     * @return array<string, string>
     */
    public static function options(): array
    {
        return [
            'en-US' => 'English (US) — 1,234.56',
            'en-GB' => 'English (UK) — 1,234.56',
            'de-DE' => 'Deutsch — 1.234,56',
            'fr-FR' => 'Français — 1 234,56',
            'nl-NL' => 'Nederlands — 1.234,56',
            'es-ES' => 'Español — 1.234,56',
            'it-IT' => 'Italiano — 1.234,56',
            'pt-PT' => 'Português — 1 234,56',
        ];
    }

    /**
     * @return list<string>
     */
    public static function keys(): array
    {
        return array_keys(self::options());
    }
}
