<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\BrandResource;
use App\Models\Brand;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class BrandController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        return BrandResource::collection(
            Brand::query()->withCount('products')->orderBy('sort_order')->orderBy('name')->get()
        );
    }

    public function store(Request $request): BrandResource
    {
        $data = $this->validated($request);
        $data['slug'] = $data['slug'] ?? $this->uniqueSlug($data['name']);

        return new BrandResource(Brand::create($data)->loadCount('products'));
    }

    public function show(Brand $brand): BrandResource
    {
        return new BrandResource($brand->loadCount('products'));
    }

    /** The slug stays put when a brand is renamed, so links to its page don't break. */
    public function update(Request $request, Brand $brand): BrandResource
    {
        $brand->update($this->validated($request, $brand));

        return new BrandResource($brand->loadCount('products'));
    }

    public function destroy(Brand $brand): JsonResponse
    {
        $count = $brand->products()->count();

        if ($count > 0) {
            return response()->json([
                'message' => "This brand still has {$count} product(s). Move them to another brand (or none) first — or switch the brand off to hide it from the shop.",
            ], 409);
        }

        $this->deleteLogoFile($brand);
        $brand->delete();

        return response()->json(['message' => 'Brand deleted.']);
    }

    public function storeLogo(Request $request, Brand $brand): BrandResource
    {
        $request->validate(['logo' => ['required', 'image', 'max:2048']]);

        $this->deleteLogoFile($brand);
        $brand->update(['logo_path' => $request->file('logo')->store('brands', 'public')]);

        return new BrandResource($brand->loadCount('products'));
    }

    public function destroyLogo(Brand $brand): BrandResource
    {
        $this->deleteLogoFile($brand);
        $brand->update(['logo_path' => null]);

        return new BrandResource($brand->loadCount('products'));
    }

    /** @return array<string, mixed> */
    private function validated(Request $request, ?Brand $brand = null): array
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'slug' => ['nullable', 'string', 'max:100', 'alpha_dash', 'unique:brands,slug,'.$brand?->id],
            'description' => ['nullable', 'string', 'max:2000'],
            'is_active' => ['sometimes', 'boolean'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);

        $data['is_active'] = $request->boolean('is_active', $brand?->is_active ?? true);
        $data['sort_order'] ??= $brand?->sort_order ?? 0;

        if ($brand !== null) {
            unset($data['slug']); // fixed at creation unless explicitly changed below
            if ($request->filled('slug')) {
                $data['slug'] = $request->string('slug')->toString();
            }
        }

        return $data;
    }

    private function uniqueSlug(string $name): string
    {
        $base = Str::slug($name) ?: 'brand';
        $slug = $base;

        for ($suffix = 2; Brand::where('slug', $slug)->exists(); $suffix++) {
            $slug = "{$base}-{$suffix}";
        }

        return $slug;
    }

    /** Only files we stored are ours to delete — a logo given as an external URL is left alone. */
    private function deleteLogoFile(Brand $brand): void
    {
        $path = $brand->logo_path;

        if ($path && ! str_starts_with($path, 'http') && ! str_starts_with($path, 'data:')) {
            Storage::disk('public')->delete($path);
        }
    }
}
