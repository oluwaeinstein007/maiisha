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

        // Keyed by the unique column (email/code) so re-running `db:seed` against
        // an already-seeded database updates these in place instead of throwing.
        User::updateOrCreate(
            ['email' => 'admin@maiisha.test'],
            ['name' => 'Aishat Isha', 'password' => bcrypt('password'), 'role' => 'admin'],
        );

        User::updateOrCreate(
            ['email' => 'customer@maiisha.test'],
            ['name' => 'Demo Customer', 'password' => bcrypt('password'), 'role' => 'customer'],
        );

        DiscountCode::updateOrCreate(
            ['code' => 'WELCOME10'],
            ['type' => 'percentage', 'value' => 10, 'usage_limit' => null, 'is_active' => true],
        );

        $this->call([
            CustomerSeeder::class,
            OrderSeeder::class,
        ]);
    }
}
