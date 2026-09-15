<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CartResource;
use App\Models\Cart;
use App\Models\CartItem;
use App\Models\ProductVariant;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class CartController extends Controller
{
    public function show(Request $request)
    {
        $cart = $this->resolveCart($request);

        return new CartResource($cart->load('items.variant.product.images'));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'product_variant_id' => ['required', 'exists:product_variants,id'],
            'quantity' => ['required', 'integer', 'min:1'],
        ]);

        $variant = ProductVariant::findOrFail($data['product_variant_id']);
        $cart = $this->resolveCart($request);

        $item = $cart->items()->where('product_variant_id', $variant->id)->first();
        $desiredQuantity = ($item?->quantity ?? 0) + $data['quantity'];

        if ($desiredQuantity > $variant->stock_quantity) {
            throw ValidationException::withMessages([
                'quantity' => "Only {$variant->stock_quantity} left in stock.",
            ]);
        }

        if ($item) {
            $item->update(['quantity' => $desiredQuantity]);
        } else {
            $cart->items()->create([
                'product_variant_id' => $variant->id,
                'quantity' => $data['quantity'],
            ]);
        }

        return new CartResource($cart->load('items.variant.product.images'));
    }

    public function update(Request $request, CartItem $item)
    {
        $data = $request->validate([
            'quantity' => ['required', 'integer', 'min:1'],
        ]);

        $cart = $this->resolveCart($request);
        abort_unless($item->cart_id === $cart->id, 404);

        if ($data['quantity'] > $item->variant->stock_quantity) {
            throw ValidationException::withMessages([
                'quantity' => "Only {$item->variant->stock_quantity} left in stock.",
            ]);
        }

        $item->update(['quantity' => $data['quantity']]);

        return new CartResource($cart->load('items.variant.product.images'));
    }

    public function destroy(Request $request, CartItem $item)
    {
        $cart = $this->resolveCart($request);
        abort_unless($item->cart_id === $cart->id, 404);

        $item->delete();

        return new CartResource($cart->load('items.variant.product.images'));
    }

    public function resolveCart(Request $request): Cart
    {
        if ($request->user()) {
            return Cart::firstOrCreate(['user_id' => $request->user()->id]);
        }

        $sessionId = $request->session()->getId();

        return Cart::firstOrCreate(['session_id' => $sessionId, 'user_id' => null]);
    }
}
