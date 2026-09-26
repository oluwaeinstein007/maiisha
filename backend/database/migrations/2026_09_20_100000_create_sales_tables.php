<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Seasonal / recurring sales (Christmas, Ileya, "Monday deals"…): automatic
        // price reductions that apply without a code, unlike discount_codes.
        Schema::create('sales', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('description')->nullable();
            $table->string('type'); // 'percentage' | 'fixed'
            $table->unsignedInteger('value'); // percentage points, or pence off if fixed
            $table->string('applies_to')->default('all'); // 'all' | 'selected' (any mix of categories, brands, products)
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('ends_at')->nullable();
            // ISO weekdays (1 = Monday … 7 = Sunday) the sale runs on within its
            // window; null = every day. This is what makes a "Monday deal" recurring.
            $table->json('active_weekdays')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('sale_category', function (Blueprint $table) {
            $table->foreignId('sale_id')->constrained()->cascadeOnDelete();
            $table->foreignId('category_id')->constrained()->cascadeOnDelete();
            $table->primary(['sale_id', 'category_id']);
        });

        Schema::create('sale_product', function (Blueprint $table) {
            $table->foreignId('sale_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->primary(['sale_id', 'product_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sale_product');
        Schema::dropIfExists('sale_category');
        Schema::dropIfExists('sales');
    }
};
