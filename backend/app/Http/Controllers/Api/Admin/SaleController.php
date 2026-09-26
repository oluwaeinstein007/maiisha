<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\SaleResource;
use App\Models\Sale;
use App\Services\SalePricing;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class SaleController extends Controller
{
    private const RELATIONS = ['categories:id,name', 'brands:id,name', 'products:id,name'];

    public function index(): AnonymousResourceCollection
    {
        return SaleResource::collection(
            Sale::query()->with(self::RELATIONS)->latest('id')->get()
        );
    }

    public function store(Request $request): SaleResource
    {
        $sale = DB::transaction(fn () => $this->persist(new Sale, $this->validated($request)));

        return new SaleResource($sale->load(self::RELATIONS));
    }

    public function show(Sale $sale): SaleResource
    {
        return new SaleResource($sale->load(self::RELATIONS));
    }

    public function update(Request $request, Sale $sale): SaleResource
    {
        DB::transaction(fn () => $this->persist($sale, $this->validated($request, $sale)));

        return new SaleResource($sale->load(self::RELATIONS));
    }

    /** Switch a sale on: it goes live straight away unless its dates or weekdays say otherwise. */
    public function activate(Sale $sale): SaleResource
    {
        $sale->update(['is_active' => true]);

        return new SaleResource($sale->load(self::RELATIONS));
    }

    /** Like discount codes, a sale is switched off rather than deleted, so past campaigns keep their name in analytics. */
    public function destroy(Sale $sale): JsonResponse
    {
        $sale->update(['is_active' => false]);

        return response()->json(['message' => 'Sale deactivated.']);
    }

    /** @param  array<string, mixed>  $data */
    private function persist(Sale $sale, array $data): Sale
    {
        $sale->fill(Arr::except($data, ['category_ids', 'brand_ids', 'product_ids']))->save();

        // A whole-shop sale names nothing; a selected one can mix lines, brands and products,
        // and may be saved with none yet (a draft being built up — it changes no prices until it has some).
        $selected = $data['applies_to'] === Sale::APPLIES_TO_SELECTED;
        $sale->categories()->sync($selected ? $data['category_ids'] : []);
        $sale->brands()->sync($selected ? $data['brand_ids'] : []);
        $sale->products()->sync($selected ? $data['product_ids'] : []);

        // sync() fires no model events, so tell the pricing service its copy is stale.
        app(SalePricing::class)->flush();

        return $sale;
    }

    /** @return array<string, mixed> */
    private function validated(Request $request, ?Sale $sale = null): array
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:255'],
            'type' => ['required', Rule::in([Sale::TYPE_PERCENTAGE, Sale::TYPE_FIXED])],
            // Percentage stops at 99: a "100% off" sale would produce £0 lines Stripe can't charge.
            'value' => [
                'required', 'integer', 'min:1',
                Rule::when($request->input('type') === Sale::TYPE_PERCENTAGE, ['max:99']),
            ],
            'applies_to' => ['required', Rule::in([Sale::APPLIES_TO_ALL, Sale::APPLIES_TO_SELECTED])],
            'category_ids' => ['nullable', 'array'],
            'category_ids.*' => ['integer', 'exists:categories,id'],
            'brand_ids' => ['nullable', 'array'],
            'brand_ids.*' => ['integer', 'exists:brands,id'],
            'product_ids' => ['nullable', 'array'],
            'product_ids.*' => ['integer', 'exists:products,id'],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date', Rule::when($request->filled('starts_at'), ['after:starts_at'])],
            'active_weekdays' => ['nullable', 'array'],
            'active_weekdays.*' => ['integer', 'between:1,7'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        // Dates arrive as wall-clock time in the shop's timezone (see SaleResource); store UTC.
        foreach (['starts_at', 'ends_at'] as $field) {
            $data[$field] = ! empty($data[$field])
                ? Carbon::parse($data[$field], config('commerce.timezone'))->utc()
                : null;
        }

        // Every day selected is the same as "no weekday restriction".
        $weekdays = collect($data['active_weekdays'] ?? [])->map(fn ($day) => (int) $day)->unique()->sort()->values();
        $data['active_weekdays'] = $weekdays->isEmpty() || $weekdays->count() === 7 ? null : $weekdays->all();

        $data['category_ids'] ??= [];
        $data['brand_ids'] ??= [];
        $data['product_ids'] ??= [];
        $data['is_active'] = $request->boolean('is_active', $sale?->is_active ?? true);

        return $data;
    }
}
