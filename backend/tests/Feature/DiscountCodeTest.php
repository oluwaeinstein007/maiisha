<?php

namespace Tests\Feature;

use App\Models\DiscountCode;
use App\Models\ProductVariant;
use App\Models\Sale;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * A promo code takes either a percentage or a fixed amount off (FR-20).
 */
class DiscountCodeTest extends TestCase
{
    use RefreshDatabase;

    private function cartOf(int $pricePence, int $quantity = 1): User
    {
        $user = User::factory()->create();
        $variant = ProductVariant::factory()->create(['stock_quantity' => 20]);
        $variant->product()->update(['price_pence' => $pricePence]);

        $this->actingAs($user)->postJson('/api/cart/items', ['product_variant_id' => $variant->id, 'quantity' => $quantity])->assertCreated();

        return $user;
    }

    private function preview(User $user, string $code): array
    {
        return $this->actingAs($user)->postJson('/api/checkout/preview', ['discount_code' => $code])->assertOk()->json();
    }

    public function test_an_admin_can_create_a_percentage_code_and_a_fixed_amount_code(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $this->actingAs($admin)->postJson('/api/admin/discount-codes', ['code' => 'tenoff', 'type' => 'percentage', 'value' => 10])
            ->assertCreated()
            ->assertJsonPath('type', 'percentage')
            ->assertJsonPath('value', 10);

        // A fixed code's value is pence: 500 is £5.00.
        $this->actingAs($admin)->postJson('/api/admin/discount-codes', ['code' => 'fiveoff', 'type' => 'fixed', 'value' => 500])
            ->assertCreated()
            ->assertJsonPath('code', 'FIVEOFF')
            ->assertJsonPath('type', 'fixed')
            ->assertJsonPath('value', 500);
    }

    public function test_only_a_percentage_is_capped_at_100(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $this->actingAs($admin)->postJson('/api/admin/discount-codes', ['code' => 'TOOMUCH', 'type' => 'percentage', 'value' => 101])
            ->assertJsonValidationErrors('value');
        $this->actingAs($admin)->postJson('/api/admin/discount-codes', ['code' => 'BIG', 'type' => 'fixed', 'value' => 5000])
            ->assertCreated();
    }

    public function test_a_percentage_code_takes_that_share_off_the_subtotal(): void
    {
        DiscountCode::factory()->create(['code' => 'TEN', 'type' => 'percentage', 'value' => 10]);

        $preview = $this->preview($this->cartOf(6000), 'TEN');

        $this->assertSame(6000, $preview['subtotal_pence']);
        $this->assertSame(600, $preview['discount_pence']);
    }

    public function test_a_fixed_code_takes_that_amount_off_the_subtotal(): void
    {
        DiscountCode::factory()->create(['code' => 'FIVEOFF', 'type' => 'fixed', 'value' => 500]);

        $preview = $this->preview($this->cartOf(6000), 'FIVEOFF');

        $this->assertSame(500, $preview['discount_pence']);
        // £60 − £5 = £55, over the free-shipping threshold; VAT is the 20% already inside it.
        $this->assertSame(5500, $preview['total_pence']);
        $this->assertSame(0, $preview['shipping_pence']);
    }

    public function test_a_fixed_code_never_takes_more_than_the_subtotal(): void
    {
        DiscountCode::factory()->create(['code' => 'HUGE', 'type' => 'fixed', 'value' => 10000]);

        $preview = $this->preview($this->cartOf(3000), 'HUGE');

        $this->assertSame(3000, $preview['discount_pence'], 'capped at the subtotal, not £100');
        $this->assertSame(399, $preview['total_pence'], 'only shipping is left to pay');
    }

    public function test_a_code_of_either_kind_applies_on_top_of_a_sale_price(): void
    {
        Sale::factory()->create(['value' => 20]); // £100 → £80 per item
        DiscountCode::factory()->create(['code' => 'PCT', 'type' => 'percentage', 'value' => 10]);
        DiscountCode::factory()->create(['code' => 'FLAT', 'type' => 'fixed', 'value' => 500]);

        $user = $this->cartOf(10000);

        $percent = $this->preview($user, 'PCT');
        $this->assertSame(8000, $percent['subtotal_pence']);
        $this->assertSame(800, $percent['discount_pence'], '10% of the £80 sale price');

        $fixed = $this->preview($user, 'FLAT');
        $this->assertSame(500, $fixed['discount_pence']);
        $this->assertSame(7500, $fixed['total_pence']);
    }

    public function test_codes_match_case_insensitively(): void
    {
        DiscountCode::factory()->create(['code' => 'ONCE', 'type' => 'fixed', 'value' => 500]);
        $user = $this->cartOf(6000);

        $this->assertSame(500, $this->preview($user, 'once')['discount_pence']);
    }
}
