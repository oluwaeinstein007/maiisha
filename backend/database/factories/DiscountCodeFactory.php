<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

class DiscountCodeFactory extends Factory
{
    public function definition(): array
    {
        return [
            'code' => strtoupper($this->faker->unique()->bothify('CODE-####')),
            'type' => 'percentage',
            'value' => 10,
            'usage_limit' => null,
            'expires_at' => null,
            'is_active' => true,
        ];
    }
}
