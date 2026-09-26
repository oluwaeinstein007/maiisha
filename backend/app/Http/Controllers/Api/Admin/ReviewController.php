<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Review;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReviewController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Review::query()->with(['product:id,name,slug', 'user:id,name,email'])->latest('id');

        if ($request->filled('rating')) {
            $query->where('rating', $request->integer('rating'));
        }

        if ($request->filled('search')) {
            $term = '%'.str_replace(['!', '%', '_'], ['!!', '!%', '!_'], mb_strtolower($request->string('search'))).'%';
            $query->where(fn ($q) => $q
                ->whereRaw("LOWER(title) LIKE ? ESCAPE '!'", [$term])
                ->orWhereRaw("LOWER(body) LIKE ? ESCAPE '!'", [$term])
                ->orWhereHas('product', fn ($p) => $p->whereRaw("LOWER(name) LIKE ? ESCAPE '!'", [$term])));
        }

        $reviews = $query->paginate(min(max($request->integer('per_page', 20), 1), 100));

        return response()->json([
            'data' => $reviews->getCollection()->map(fn (Review $r) => [
                'id' => $r->id,
                'rating' => $r->rating,
                'title' => $r->title,
                'body' => $r->body,
                'created_at' => $r->created_at,
                'product' => ['id' => $r->product->id, 'name' => $r->product->name, 'slug' => $r->product->slug],
                'customer' => ['id' => $r->user->id, 'name' => $r->user->name, 'email' => $r->user->email],
            ])->values(),
            'meta' => ['current_page' => $reviews->currentPage(), 'last_page' => $reviews->lastPage(), 'total' => $reviews->total()],
        ]);
    }

    public function destroy(Review $review): JsonResponse
    {
        $review->delete();

        return response()->json(['message' => 'Review removed.']);
    }
}
