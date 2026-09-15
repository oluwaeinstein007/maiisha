<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_variant_id')->nullable()->constrained()->nullOnDelete();

            // Snapshot product details at time of order, so later edits/deletes don't rewrite history.
            $table->string('product_name');
            $table->string('sku');
            $table->string('size')->nullable();
            $table->string('colour')->nullable();
            $table->unsignedInteger('unit_price_pence');
            $table->unsignedInteger('quantity');
            $table->unsignedInteger('line_total_pence');

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_items');
    }
};
