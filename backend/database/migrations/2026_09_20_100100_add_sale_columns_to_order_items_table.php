<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('order_items', function (Blueprint $table) {
            // Point-in-time record of a sale that priced this line, alongside the
            // existing unit_price_pence snapshot: without these the analytics can't
            // tell what a sale actually cost the shop or which campaign earned what.
            // Both null for a full-price line (and for every order placed before sales existed).
            $table->unsignedInteger('original_unit_price_pence')->nullable()->after('unit_price_pence');
            $table->foreignId('sale_id')->nullable()->after('original_unit_price_pence')
                ->constrained()->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('order_items', function (Blueprint $table) {
            $table->dropConstrainedForeignId('sale_id');
            $table->dropColumn('original_unit_price_pence');
        });
    }
};
