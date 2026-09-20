<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('product_images', function (Blueprint $table) {
            // FR-3: lets a photo be tied to the variant colour it was taken in,
            // so the gallery (and order history) can show the right photo for
            // the colour a customer has selected/bought. Nullable/no default
            // needed — a product with one colour, or an image shot before this
            // existed, just has no colour and falls back to the first photo
            // (see Product::imageFor()).
            $table->string('colour')->nullable()->after('alt_text');
        });
    }

    public function down(): void
    {
        Schema::table('product_images', function (Blueprint $table) {
            $table->dropColumn('colour');
        });
    }
};
