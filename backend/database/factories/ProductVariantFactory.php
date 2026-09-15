<?php

namespace Database\Factories;

use App\Models\Product;
use Illuminate\Database\Eloquent\Factories\Factory;

class ProductVariantFactory extends Factory
{
    public function definition(): array
    {
        return [
            'product_id' => Product::factory(),
            'sku' => strtoupper($this->faker->unique()->bothify('SKU-####-??')),
            'size' => $this->faker->randomElement(['S', 'M', 'L']),
            'stock_quantity' => 10,
            'low_stock_threshold' => 5,
            'is_active' => true,
        ];
    }
}
