<?php

namespace Database\Seeders;

use App\Models\DiscountCode;
use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            CategorySeeder::class,
            ProductSeeder::class,
        ]);

        User::factory()->create([
            'name' => 'Aishat Isha',
            'email' => 'admin@maiisha.test',
            'password' => bcrypt('password'),
            'role' => 'admin',
        ]);

        User::factory()->create([
            'name' => 'Demo Customer',
            'email' => 'customer@maiisha.test',
            'password' => bcrypt('password'),
            'role' => 'customer',
        ]);

        DiscountCode::create([
            'code' => 'WELCOME10',
            'type' => 'percentage',
            'value' => 10,
            'usage_limit' => null,
            'is_active' => true,
        ]);

        $this->call([
            CustomerSeeder::class,
            OrderSeeder::class,
        ]);
    }
}
