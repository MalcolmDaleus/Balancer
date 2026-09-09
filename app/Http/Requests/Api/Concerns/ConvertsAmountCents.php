<?php

namespace App\Http\Requests\Api\Concerns;

use App\Support\MoneyCents;

trait ConvertsAmountCents
{
    /**
     * @param  array-key|null  $key
     */
    public function validated($key = null, $default = null): mixed
    {
        $data = parent::validated($key, $default);

        if (is_array($data)) {
            return MoneyCents::takeCents($data);
        }

        return $data;
    }
}
