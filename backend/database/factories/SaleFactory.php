<?php

namespace Database\Factories;

use App\Models\Sale;
use Illuminate\Database\Eloquent\Factories\Factory;

class SaleFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name' => ucfirst($this->faker->unique()->words(2, true)).' Sale',
            'description' => null,
            'type' => Sale::TYPE_PERCENTAGE,
            'value' => 20,
            'applies_to' => Sale::APPLIES_TO_ALL,
            'starts_at' => null,
            'ends_at' => null,
            'active_weekdays' => null,
            'is_active' => true,
        ];
    }
}
