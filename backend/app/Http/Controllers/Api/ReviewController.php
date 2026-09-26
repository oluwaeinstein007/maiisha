<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Product;
use App\Models\Review;
use Illuminate\Http\Request;

class ReviewController extends Controller
{
    public function index(Request $request, string $slug)
    {
        $product = Product::query()->active()->where('slug', $slug)->firstOrFail();

        $reviews = $product->reviews()->with('user:id,name')->latest('id')->paginate(10);
        $distribution = $product->reviews()->selectRaw('rating, COUNT(*) as total')->groupBy('rating')->pluck('total', 'rating');

        $user = $request->user('sanctum');

        return response()->json([
            'summary' => [
                'average' => $product->reviews()->count() ? round((float) $product->reviews()->avg('rating'), 1) : null,
                'count' => $product->reviews()->count(),
                'distribution' => collect([5, 4, 3, 2, 1])->mapWithKeys(fn ($star) => [$star => (int) ($distribution[$star] ?? 0)]),
            ],
            'can_review' => $user ? $this->hasPurchased($user->id, $product->id) : false,
            'my_review' => $user ? $this->present($product->reviews()->where('user_id', $user->id)->with('user:id,name')->first()) : null,
            'data' => $reviews->getCollection()->map(fn (Review $r) => $this->present($r))->values(),
            'meta' => ['current_page' => $reviews->currentPage(), 'last_page' => $reviews->lastPage()],
        ]);
    }

    public function store(Request $request, string $slug)
    {
        $product = Product::query()->active()->where('slug', $slug)->firstOrFail();

        abort_unless(
            $this->hasPurchased($request->user()->id, $product->id),
            403,
            'Only customers who bought this product can review it.'
        );

        $data = $request->validate([
            'rating' => ['required', 'integer', 'between:1,5'],
            'title' => ['nullable', 'string', 'max:120'],
            'body' => ['nullable', 'string', 'max:2000'],
        ]);

        $review = Review::updateOrCreate(
            ['product_id' => $product->id, 'user_id' => $request->user()->id],
            $data
        );

        return response()->json(['data' => $this->present($review->load('user:id,name'))], 201);
    }

    private function hasPurchased(int $userId, int $productId): bool
    {
        return Order::query()
            ->where('user_id', $userId)
            ->whereIn('status', Order::PAID_STATUSES)
            ->whereHas('items.variant', fn ($q) => $q->where('product_id', $productId))
            ->exists();
    }

    private function present(?Review $review): ?array
    {
        return $review ? [
            'id' => $review->id,
            'rating' => $review->rating,
            'title' => $review->title,
            'body' => $review->body,
            // First name + initial only: reviews are public.
            'author' => collect(explode(' ', trim($review->user->name)))->pipe(
                fn ($p) => $p->count() > 1 ? $p->first().' '.mb_substr($p->last(), 0, 1).'.' : $p->first()
            ),
            'created_at' => $review->created_at,
        ] : null;
    }
}
