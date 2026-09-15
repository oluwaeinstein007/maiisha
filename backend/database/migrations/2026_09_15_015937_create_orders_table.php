<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->string('order_number')->unique();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('address_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('discount_code_id')->nullable()->constrained()->nullOnDelete();

            // Status: placed -> processing -> shipped -> delivered (FR-17); cancelled possible.
            $table->string('status')->default('placed');

            // All amounts in pence to avoid floating point money errors.
            $table->unsignedInteger('subtotal_pence');
            $table->integer('discount_pence')->default(0);
            $table->unsignedInteger('vat_pence');
            $table->unsignedInteger('shipping_pence')->default(0);
            $table->unsignedInteger('total_pence');

            $table->string('currency', 3)->default('GBP');

            $table->timestamp('shipped_at')->nullable();
            $table->timestamp('delivered_at')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
