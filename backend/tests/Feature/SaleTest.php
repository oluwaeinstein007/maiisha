<?php

namespace Tests\Feature;

use App\Contracts\PaymentGateway;
use App\Models\Address;
use App\Models\Brand;
use App\Models\Category;
use App\Models\DiscountCode;
use App\Models\Order;
use App\Models\Product;
use App\Models\Sale;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\Support\FakePaymentGateway;
use Tests\TestCase;

class SaleTest extends TestCase
{
    use RefreshDatabase;

    private function product(int $pricePence = 10000, ?Category $category = null): Product
    {
        $product = Product::factory()
            ->for($category ?? Category::factory()->create())
            ->create(['price_pence' => $pricePence]);
        $product->variants()->create(['sku' => 'SKU-'.uniqid(), 'size' => 'M', 'stock_quantity' => 10]);

        return $product;
    }

    /** @return array<string, mixed> the product as the storefront listing shows it */
    private function listed(Product $product): array
    {
        return collect($this->getJson('/api/products')->assertOk()->json('data'))->firstWhere('id', $product->id);
    }

    private function addToCart(User $user, Product $product, int $quantity = 1): void
    {
        $this->actingAs($user)->postJson('/api/cart/items', [
            'product_variant_id' => $product->variants()->first()->id,
            'quantity' => $quantity,
        ])->assertCreated();
    }

    public function test_a_live_percentage_sale_lowers_the_listed_price_and_keeps_the_original_to_strike_through(): void
    {
        $product = $this->product(10000);
        Sale::factory()->create(['name' => 'Christmas Sale', 'type' => 'percentage', 'value' => 20]);

        $listed = $this->listed($product);

        $this->assertSame(8000, $listed['min_price_pence']);
        $this->assertSame(10000, $listed['compare_at_price_pence']);
        $this->assertSame('Christmas Sale', $listed['sale']['name']);
        $this->assertSame('20% off', $listed['sale']['label']);
        $this->assertSame(20, $listed['sale']['discount_percent']);
        $this->assertSame(8000, $listed['variants'][0]['price_pence']);
        $this->assertSame(10000, $listed['variants'][0]['compare_at_price_pence']);
    }

    public function test_a_product_not_on_sale_shows_no_sale_fields(): void
    {
        $product = $this->product(10000);

        $listed = $this->listed($product);

        $this->assertSame(10000, $listed['min_price_pence']);
        $this->assertNull($listed['compare_at_price_pence']);
        $this->assertNull($listed['sale']);
    }

    public function test_a_fixed_sale_takes_pence_off_and_never_goes_below_zero(): void
    {
        $dear = $this->product(10000);
        $cheap = $this->product(300);
        Sale::factory()->create(['type' => 'fixed', 'value' => 500]);

        $this->assertSame(9500, $this->listed($dear)['min_price_pence']);
        $this->assertSame(0, $this->listed($cheap)['min_price_pence']);
    }

    public function test_percentage_discounts_round_half_up_to_the_penny(): void
    {
        // 15% of £9.99 is 149.85p → 150p off, so £8.49.
        $product = $this->product(999);
        Sale::factory()->create(['type' => 'percentage', 'value' => 15]);

        $this->assertSame(849, $this->listed($product)['min_price_pence']);
    }

    public function test_a_sale_outside_its_window_or_switched_off_does_not_apply(): void
    {
        $product = $this->product(10000);
        Sale::factory()->create(['starts_at' => now()->addDay()]);
        Sale::factory()->create(['ends_at' => now()->subDay()]);
        Sale::factory()->create(['is_active' => false]);

        $this->assertSame(10000, $this->listed($product)['min_price_pence']);
    }

    public function test_a_sale_switches_on_and_off_at_its_boundaries(): void
    {
        $product = $this->product(10000);
        Sale::factory()->create([
            'starts_at' => Carbon::parse('2026-12-01 00:00:00', 'UTC'),
            'ends_at' => Carbon::parse('2026-12-26 23:59:59', 'UTC'),
        ]);

        $this->travelTo(Carbon::parse('2026-11-30 23:59:59', 'UTC'));
        $this->assertSame(10000, $this->listed($product)['min_price_pence']);

        $this->travelTo(Carbon::parse('2026-12-01 00:00:00', 'UTC'));
        $this->assertSame(8000, $this->listed($product)['min_price_pence']);

        $this->travelTo(Carbon::parse('2026-12-26 23:59:59', 'UTC'));
        $this->assertSame(8000, $this->listed($product)['min_price_pence']);

        $this->travelTo(Carbon::parse('2026-12-27 00:00:00', 'UTC'));
        $this->assertSame(10000, $this->listed($product)['min_price_pence']);
    }

    public function test_a_monday_deal_runs_on_mondays_in_shop_time_not_utc(): void
    {
        $product = $this->product(10000);
        Sale::factory()->create(['active_weekdays' => [1]]);

        // Mon 15 Jun 2026, midday: plainly Monday everywhere.
        $this->travelTo(Carbon::parse('2026-06-15 12:00:00', 'UTC'));
        $this->assertSame(8000, $this->listed($product)['min_price_pence']);

        $this->travelTo(Carbon::parse('2026-06-16 12:00:00', 'UTC'));
        $this->assertSame(10000, $this->listed($product)['min_price_pence']);

        // 23:30 UTC on Sunday is already 00:30 Monday in the UK (BST) — the deal has begun.
        $this->travelTo(Carbon::parse('2026-06-14 23:30:00', 'UTC'));
        $this->assertSame(8000, $this->listed($product)['min_price_pence']);

        // …and 23:30 UTC on Monday is 00:30 Tuesday in the UK — it's over.
        $this->travelTo(Carbon::parse('2026-06-15 23:30:00', 'UTC'));
        $this->assertSame(10000, $this->listed($product)['min_price_pence']);
    }

    public function test_a_category_sale_covers_its_subcategories_but_not_other_categories(): void
    {
        $women = Category::factory()->create();
        $dresses = Category::factory()->create(['parent_id' => $women->id]);
        $shoes = Category::factory()->create();

        $inParent = $this->product(10000, $women);
        $inChild = $this->product(10000, $dresses);
        $elsewhere = $this->product(10000, $shoes);

        $sale = Sale::factory()->create(['applies_to' => 'selected']);
        $sale->categories()->sync([$women->id]);

        $this->assertSame(8000, $this->listed($inParent)['min_price_pence']);
        $this->assertSame(8000, $this->listed($inChild)['min_price_pence']);
        $this->assertSame(10000, $this->listed($elsewhere)['min_price_pence']);
    }

    public function test_a_product_sale_covers_only_the_chosen_products(): void
    {
        $chosen = $this->product(10000);
        $other = $this->product(10000);

        $sale = Sale::factory()->create(['applies_to' => 'selected']);
        $sale->products()->sync([$chosen->id]);

        $this->assertSame(8000, $this->listed($chosen)['min_price_pence']);
        $this->assertSame(10000, $this->listed($other)['min_price_pence']);
    }

    public function test_a_selected_sale_covers_a_chosen_line_brand_or_product_and_nothing_else(): void
    {
        $shoes = Category::factory()->create();
        $bags = Category::factory()->create();
        $brand = Brand::factory()->create();

        $inLine = $this->product(10000, $shoes);
        $ofBrand = $this->product(10000, $bags);
        $ofBrand->update(['brand_id' => $brand->id]);
        $handPicked = $this->product(10000, $bags);
        $untouched = $this->product(10000, $bags);

        $sale = Sale::factory()->create(['applies_to' => 'selected']);
        $sale->categories()->sync([$shoes->id]);
        $sale->brands()->sync([$brand->id]);
        $sale->products()->sync([$handPicked->id]);

        $this->assertSame(8000, $this->listed($inLine)['min_price_pence']);
        $this->assertSame(8000, $this->listed($ofBrand)['min_price_pence']);
        $this->assertSame(8000, $this->listed($handPicked)['min_price_pence']);
        $this->assertSame(10000, $this->listed($untouched)['min_price_pence']);

        // The SQL price (used to filter and sort) must agree with the PHP price for the same union.
        $this->assertCount(3, $this->getJson('/api/products?max_price=8000')->json('data'));
        $this->assertCount(3, $this->getJson('/api/products?on_sale=1')->json('data'));
    }

    public function test_a_selected_sale_with_nothing_chosen_changes_no_prices(): void
    {
        $product = $this->product(10000);
        Sale::factory()->create(['applies_to' => 'selected']);

        $listed = $this->listed($product);

        $this->assertSame(10000, $listed['min_price_pence']);
        $this->assertNull($listed['sale']);
        $this->assertCount(0, $this->getJson('/api/products?on_sale=1')->json('data'));
    }

    public function test_a_manual_sale_with_no_dates_is_live_exactly_while_it_is_switched_on(): void
    {
        $product = $this->product(10000);
        $sale = Sale::factory()->create(['is_active' => false]);

        $this->assertSame(10000, $this->listed($product)['min_price_pence']);

        $sale->update(['is_active' => true]);
        $this->assertSame(8000, $this->listed($product)['min_price_pence']);

        // No end date: it is still live months later, until someone switches it off.
        $this->travelTo(now()->addMonths(6));
        $this->assertSame(8000, $this->listed($product)['min_price_pence']);

        $sale->update(['is_active' => false]);
        $this->assertSame(10000, $this->listed($product)['min_price_pence']);
    }

    public function test_when_several_sales_apply_the_best_price_wins_and_they_do_not_stack(): void
    {
        $product = $this->product(10000);
        Sale::factory()->create(['name' => 'Small', 'value' => 10]);
        Sale::factory()->create(['name' => 'Big', 'value' => 30]);

        $listed = $this->listed($product);

        $this->assertSame(7000, $listed['min_price_pence']);
        $this->assertSame('Big', $listed['sale']['name']);
    }

    public function test_a_variant_price_override_is_discounted_from_the_override(): void
    {
        $product = $this->product(10000);
        $product->variants()->update(['price_override_pence' => 5000]);
        Sale::factory()->create(['value' => 20]);

        $this->assertSame(4000, $this->listed($product)['variants'][0]['price_pence']);
        $this->assertSame(5000, $this->listed($product)['variants'][0]['compare_at_price_pence']);
    }

    public function test_editing_a_sale_is_priced_immediately(): void
    {
        $product = $this->product(10000);
        $sale = Sale::factory()->create(['value' => 20]);
        $this->assertSame(8000, $this->listed($product)['min_price_pence']);

        $sale->update(['value' => 50]);

        $this->assertSame(5000, $this->listed($product)['min_price_pence']);
    }

    public function test_the_cart_and_checkout_preview_use_the_sale_price_and_report_the_saving(): void
    {
        $user = User::factory()->create();
        $product = $this->product(10000);
        Sale::factory()->create(['value' => 20]);

        $this->addToCart($user, $product, 2);

        $cart = $this->actingAs($user)->getJson('/api/cart')->assertOk();
        $this->assertSame(8000, $cart->json('data.items.0.unit_price_pence'));
        $this->assertSame(10000, $cart->json('data.items.0.compare_at_unit_price_pence'));
        $this->assertSame(16000, $cart->json('data.subtotal_pence'));
        $this->assertSame(4000, $cart->json('data.savings_pence'));

        $preview = $this->actingAs($user)->postJson('/api/checkout/preview')->assertOk();
        $this->assertSame(16000, $preview->json('subtotal_pence'));
        $this->assertSame(4000, $preview->json('sale_savings_pence'));
    }

    public function test_a_discount_code_applies_on_top_of_the_sale_price(): void
    {
        $user = User::factory()->create();
        $product = $this->product(10000);
        Sale::factory()->create(['value' => 20]);
        DiscountCode::factory()->create(['code' => 'EXTRA10', 'type' => 'percentage', 'value' => 10]);

        $this->addToCart($user, $product, 2);

        // 10% of the sale-priced £160, not of the £200 list price.
        $this->actingAs($user)->postJson('/api/checkout/preview', ['discount_code' => 'EXTRA10'])
            ->assertOk()
            ->assertJson(['subtotal_pence' => 16000, 'discount_pence' => 1600]);
    }

    public function test_the_order_records_the_sale_price_charged_and_the_sale_behind_it(): void
    {
        $gateway = new FakePaymentGateway;
        $this->app->instance(PaymentGateway::class, $gateway);

        $user = User::factory()->create();
        $address = Address::factory()->for($user)->create();
        $product = $this->product(10000);
        $sale = Sale::factory()->create(['value' => 20]);

        $this->addToCart($user, $product, 2);
        $this->actingAs($user)->postJson('/api/checkout', ['address_id' => $address->id])->assertOk();

        $item = Order::first()->items->first();
        $this->assertSame(8000, $item->unit_price_pence);
        $this->assertSame(10000, $item->original_unit_price_pence);
        $this->assertSame($sale->id, $item->sale_id);
        $this->assertSame(16000, $item->line_total_pence);

        // The card is charged the sale-priced total (plus flat shipping, as the subtotal is over £50 → free).
        $this->assertSame(Order::first()->total_pence, $gateway->calls[0]['amountPence']);
        $this->assertSame(16000, $gateway->calls[0]['amountPence']);
    }

    public function test_a_full_price_order_line_records_no_sale(): void
    {
        $this->app->instance(PaymentGateway::class, new FakePaymentGateway);

        $user = User::factory()->create();
        $address = Address::factory()->for($user)->create();
        $product = $this->product(10000);

        $this->addToCart($user, $product);
        $this->actingAs($user)->postJson('/api/checkout', ['address_id' => $address->id])->assertOk();

        $item = Order::first()->items->first();
        $this->assertNull($item->original_unit_price_pence);
        $this->assertNull($item->sale_id);
    }

    public function test_a_sale_that_ends_before_checkout_is_charged_at_the_normal_price(): void
    {
        $user = User::factory()->create();
        $product = $this->product(10000);
        Sale::factory()->create(['value' => 20, 'ends_at' => now()->addHour()]);

        $this->addToCart($user, $product);
        $this->assertSame(8000, $this->actingAs($user)->getJson('/api/cart')->json('data.subtotal_pence'));

        $this->travelTo(now()->addHours(2));

        $this->actingAs($user)->postJson('/api/checkout/preview')
            ->assertOk()
            ->assertJson(['subtotal_pence' => 10000, 'sale_savings_pence' => 0]);
    }

    public function test_the_active_sales_endpoint_lists_only_live_sales_without_admin_fields(): void
    {
        $shoes = Category::factory()->create(['name' => 'Shoes', 'slug' => 'shoes']);
        $live = Sale::factory()->create(['name' => 'Autumn Sale', 'applies_to' => 'selected']);
        $live->categories()->sync([$shoes->id]);
        Sale::factory()->create(['name' => 'Not yet', 'starts_at' => now()->addWeek()]);
        Sale::factory()->create(['name' => 'Over', 'ends_at' => now()->subWeek()]);
        Sale::factory()->create(['name' => 'Off', 'is_active' => false]);

        $response = $this->getJson('/api/sales/active')->assertOk();

        $this->assertSame(['Autumn Sale'], collect($response->json('data'))->pluck('name')->all());
        $this->assertSame('20% off', $response->json('data.0.label'));
        $this->assertSame([['name' => 'Shoes', 'slug' => 'shoes']], $response->json('data.0.categories'));
        $this->assertArrayNotHasKey('is_active', $response->json('data.0'));
        $this->assertArrayNotHasKey('status', $response->json('data.0'));
    }
}
