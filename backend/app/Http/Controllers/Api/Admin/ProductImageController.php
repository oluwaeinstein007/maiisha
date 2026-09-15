<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ProductImage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ProductImageController extends Controller
{
    public function store(Request $request, Product $product)
    {
        $data = $request->validate([
            'image' => ['required', 'image', 'max:5120'],
            'alt_text' => ['nullable', 'string', 'max:255'],
        ]);

        $path = $request->file('image')->store('products', 'public');

        $image = $product->images()->create([
            'path' => $path,
            'alt_text' => $data['alt_text'] ?? null,
            'sort_order' => $product->images()->count(),
        ]);

        return response()->json([
            'id' => $image->id,
            'url' => $image->url(),
            'alt_text' => $image->alt_text,
        ]);
    }

    public function destroy(ProductImage $image)
    {
        Storage::disk('public')->delete($image->path);
        $image->delete();

        return response()->json(['message' => 'Image deleted.']);
    }
}
