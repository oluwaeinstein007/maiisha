<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            // PRD FR-23: lets an admin choose whether an out-of-stock product
            // disappears from browsing or stays visible marked "out of stock".
            // Defaults to false so existing catalogue behaviour is unchanged.
            $table->boolean('hide_when_out_of_stock')->default(false)->after('is_featured');
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn('hide_when_out_of_stock');
        });
    }
};
