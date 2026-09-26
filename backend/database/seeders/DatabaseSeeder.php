<?php

namespace Database\Seeders;

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
            BrandSeeder::class,
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

        // Sales go in before the orders: OrderSeeder prices each demo order as of the
        // day it was placed, so the past sale below shows up in their history.
        $this->call([
            DiscountCodeSeeder::class,
            CustomerSeeder::class,
            SaleSeeder::class,
            OrderSeeder::class,
        ]);
    }
}
