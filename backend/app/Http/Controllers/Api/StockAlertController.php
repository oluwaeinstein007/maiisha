<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\Request;

class StockAlertController extends Controller
{
    public function store(Request $request, string $slug)
    {
        $product = Product::query()->active()->where('slug', $slug)->with('variants')->firstOrFail();
        $data = $request->validate(['email' => ['required', 'email:rfc', 'max:255']]);

        abort_if($product->inStock(), 422, 'This product is already in stock.');

        $product->stockAlerts()->firstOrCreate(['email' => mb_strtolower($data['email'])]);

        // Same reply whether or not they were already subscribed.
        return response()->json(['message' => "We'll email you when it's back."], 201);
    }
}
