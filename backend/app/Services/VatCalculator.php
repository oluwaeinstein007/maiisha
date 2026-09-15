<?php

namespace App\Services;

/**
 * UK VAT (FR-13). Rate is a configurable module (config/commerce.php) so
 * other jurisdictions/rates can be added later per PRD NFR-4 without
 * touching checkout logic.
 */
class VatCalculator
{
    public function __construct(private readonly float $rate) {}

    public function rate(): float
    {
        return $this->rate;
    }

    /**
     * Given a VAT-inclusive amount, return the VAT portion (in pence).
     */
    public function vatPenceFromInclusive(int $inclusivePence): int
    {
        return (int) round($inclusivePence - ($inclusivePence / (1 + $this->rate)));
    }
}
