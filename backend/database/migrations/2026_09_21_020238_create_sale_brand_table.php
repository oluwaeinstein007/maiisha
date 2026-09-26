<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // A sale can target whole brands as well as categories and individual products.
        Schema::create('sale_brand', function (Blueprint $table) {
            $table->foreignId('sale_id')->constrained()->cascadeOnDelete();
            $table->foreignId('brand_id')->constrained()->cascadeOnDelete();
            $table->primary(['sale_id', 'brand_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sale_brand');
    }
};
