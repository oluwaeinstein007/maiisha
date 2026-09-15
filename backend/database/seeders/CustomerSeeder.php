<?php

namespace Database\Seeders;

use App\Models\Address;
use App\Models\User;
use Illuminate\Database\Seeder;

class CustomerSeeder extends Seeder
{
    /** Realistic UK customers with a home delivery address each. */
    private const CUSTOMERS = [
        [
            'name' => 'Amara Okonkwo',
            'email' => 'amara.okonkwo@example.com',
            'phone' => '+44 7700 900123',
            'address' => ['line1' => '14 Elm Grove', 'city' => 'Peckham, London', 'postcode' => 'SE15 5DQ'],
        ],
        [
            'name' => 'Fatima Al-Sayed',
            'email' => 'fatima.alsayed@example.com',
            'phone' => '+44 7700 900456',
            'address' => ['line1' => '82 Stratford Road', 'city' => 'Birmingham', 'postcode' => 'B11 1AR'],
        ],
        [
            'name' => 'Chidinma Eze',
            'email' => 'chidinma.eze@example.com',
            'phone' => '+44 7700 900789',
            'address' => ['line1' => '27 Cheetham Hill Road', 'city' => 'Manchester', 'postcode' => 'M8 8PS'],
        ],
        [
            'name' => 'Yasmin Hussain',
            'email' => 'yasmin.hussain@example.com',
            'phone' => '+44 7700 900234',
            'address' => ['line1' => '9 Ecclesall Road', 'city' => 'Sheffield', 'postcode' => 'S11 8PA'],
        ],
        [
            'name' => 'Blessing Adeyemi',
            'email' => 'blessing.adeyemi@example.com',
            'phone' => '+44 7700 900567',
            'address' => ['line1' => '113 Kingsland Road', 'city' => 'Hackney, London', 'postcode' => 'E8 2PB'],
        ],
        [
            'name' => 'Khadija Bello',
            'email' => 'khadija.bello@example.com',
            'phone' => '+44 7700 900890',
            'address' => ['line1' => '45 Alum Rock Road', 'city' => 'Birmingham', 'postcode' => 'B8 1JR'],
        ],
        [
            'name' => 'Ngozi Williams',
            'email' => 'ngozi.williams@example.com',
            'phone' => '+44 7700 900321',
            'address' => ['line1' => '6 Wilmslow Road', 'city' => 'Manchester', 'postcode' => 'M14 5TB'],
        ],
        [
            'name' => 'Aisha Bakare',
            'email' => 'aisha.bakare@example.com',
            'phone' => '+44 7700 900654',
            'address' => ['line1' => '31 Cathays Terrace', 'city' => 'Cardiff', 'postcode' => 'CF24 4HX'],
        ],
        [
            'name' => 'Rukayat Lawal',
            'email' => 'rukayat.lawal@example.com',
            'phone' => '+44 7700 900987',
            'address' => ['line1' => '18 Leith Walk', 'city' => 'Edinburgh', 'postcode' => 'EH6 8LN'],
        ],
        [
            'name' => 'Temitope Johnson',
            'email' => 'temitope.johnson@example.com',
            'phone' => '+44 7700 900111',
            'address' => ['line1' => '5 Lozells Road', 'city' => 'Birmingham', 'postcode' => 'B19 1RN'],
        ],
    ];

    public function run(): void
    {
        foreach (self::CUSTOMERS as $def) {
            $user = User::create([
                'name' => $def['name'],
                'email' => $def['email'],
                'phone' => $def['phone'],
                'email_verified_at' => now(),
                'password' => bcrypt('password'),
                'role' => 'customer',
            ]);

            Address::create([
                'user_id' => $user->id,
                'label' => 'Home',
                'full_name' => $def['name'],
                'line1' => $def['address']['line1'],
                'city' => $def['address']['city'],
                'postcode' => $def['address']['postcode'],
                'country' => 'GB',
                'phone' => $def['phone'],
                'is_default' => true,
            ]);
        }
    }
}
