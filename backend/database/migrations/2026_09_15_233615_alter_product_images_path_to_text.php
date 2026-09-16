<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * varchar(255) is too small for a data: URI (used by seed placeholder
     * images); doctrine/dbal isn't installed, so this uses a raw statement
     * rather than Blueprint::change() for the Postgres-only column type change.
     */
    public function up(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE product_images ALTER COLUMN path TYPE text');
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE product_images ALTER COLUMN path TYPE varchar(255)');
        }
    }
};
