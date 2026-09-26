<?php

namespace Database\Seeders;

use App\Models\DiscountCode;
use Illuminate\Database\Seeder;

class DiscountCodeSeeder extends Seeder
{
    /**
     * One of each kind of promo code — a percentage off, and a fixed amount off (value
     * in pence) — keyed by code so re-running `db:seed` updates in place.
     */
    public function run(): void
    {
        DiscountCode::updateOrCreate(
            ['code' => 'WELCOME10'],
            ['type' => 'percentage', 'value' => 10, 'usage_limit' => null, 'is_active' => true],
        );

        DiscountCode::updateOrCreate(
            ['code' => 'FIVEOFF'],
            ['type' => 'fixed', 'value' => 500, 'usage_limit' => null, 'is_active' => true],
        );
    }
}
