<?php

namespace Tests\Feature;

use App\Models\Brand;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AdminBrandManagementTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        return User::factory()->create(['role' => 'admin']);
    }

    public function test_guests_and_customers_cannot_manage_brands(): void
    {
        $this->getJson('/api/admin/brands')->assertUnauthorized();

        $customer = User::factory()->create(['role' => 'customer']);
        $this->actingAs($customer)->getJson('/api/admin/brands')->assertForbidden();
        $this->actingAs($customer)->postJson('/api/admin/brands', ['name' => 'Nope'])->assertForbidden();
        $this->assertDatabaseCount('brands', 0);
    }

    public function test_an_admin_can_create_a_brand_and_the_slug_comes_from_the_name(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)->postJson('/api/admin/brands', ['name' => 'Zuri Beauty', 'description' => 'Skincare'])
            ->assertCreated()
            ->assertJsonPath('data.slug', 'zuri-beauty')
            ->assertJsonPath('data.is_active', true)
            ->assertJsonPath('data.sort_order', 0)
            ->assertJsonPath('data.products_count', 0);

        // Same name again: a unique slug, not an error.
        $this->actingAs($admin)->postJson('/api/admin/brands', ['name' => 'Zuri Beauty'])
            ->assertCreated()
            ->assertJsonPath('data.slug', 'zuri-beauty-2');
    }

    public function test_brand_validation(): void
    {
        $admin = $this->admin();
        Brand::factory()->create(['slug' => 'taken']);

        $this->actingAs($admin)->postJson('/api/admin/brands', [])->assertJsonValidationErrors('name');
        $this->actingAs($admin)->postJson('/api/admin/brands', ['name' => 'X', 'slug' => 'taken'])->assertJsonValidationErrors('slug');
        $this->actingAs($admin)->postJson('/api/admin/brands', ['name' => 'X', 'slug' => 'not a slug!'])->assertJsonValidationErrors('slug');
        $this->actingAs($admin)->postJson('/api/admin/brands', ['name' => 'X', 'sort_order' => -1])->assertJsonValidationErrors('sort_order');
    }

    public function test_renaming_a_brand_keeps_its_slug_so_links_do_not_break(): void
    {
        $brand = Brand::factory()->create(['name' => 'Old Name', 'slug' => 'old-name']);

        $this->actingAs($this->admin())->putJson("/api/admin/brands/{$brand->id}", ['name' => 'New Name'])
            ->assertOk()
            ->assertJsonPath('data.name', 'New Name')
            ->assertJsonPath('data.slug', 'old-name');

        $this->actingAs($this->admin())->putJson("/api/admin/brands/{$brand->id}", ['name' => 'New Name', 'slug' => 'new-name'])
            ->assertJsonPath('data.slug', 'new-name');
    }

    public function test_a_brand_can_be_switched_off_and_on_without_losing_its_products(): void
    {
        $admin = $this->admin();
        $brand = Brand::factory()->create();
        $product = Product::factory()->create(['brand_id' => $brand->id]);

        $this->actingAs($admin)->putJson("/api/admin/brands/{$brand->id}", ['name' => $brand->name, 'is_active' => false])
            ->assertJsonPath('data.is_active', false);
        $this->assertSame($brand->id, $product->fresh()->brand_id);

        $this->actingAs($admin)->putJson("/api/admin/brands/{$brand->id}", ['name' => $brand->name, 'is_active' => true])
            ->assertJsonPath('data.is_active', true);
    }

    public function test_the_admin_list_includes_switched_off_brands_with_their_product_counts(): void
    {
        $live = Brand::factory()->create(['name' => 'Live', 'sort_order' => 1]);
        Brand::factory()->create(['name' => 'Off', 'is_active' => false, 'sort_order' => 2]);
        Product::factory()->count(2)->create(['brand_id' => $live->id]);

        $response = $this->actingAs($this->admin())->getJson('/api/admin/brands')->assertOk();

        $this->assertSame(['Live', 'Off'], collect($response->json('data'))->pluck('name')->all());
        $this->assertSame([2, 0], collect($response->json('data'))->pluck('products_count')->all());
    }

    public function test_a_brand_with_products_cannot_be_deleted_but_an_empty_one_can(): void
    {
        $admin = $this->admin();
        $used = Brand::factory()->create();
        $unused = Brand::factory()->create();
        Product::factory()->create(['brand_id' => $used->id]);

        $this->actingAs($admin)->deleteJson("/api/admin/brands/{$used->id}")->assertStatus(409);
        $this->assertDatabaseHas('brands', ['id' => $used->id]);

        $this->actingAs($admin)->deleteJson("/api/admin/brands/{$unused->id}")->assertOk();
        $this->assertDatabaseMissing('brands', ['id' => $unused->id]);
    }

    public function test_a_logo_can_be_uploaded_replaced_and_removed(): void
    {
        Storage::fake('public');
        $admin = $this->admin();
        $brand = Brand::factory()->create();

        $first = $this->actingAs($admin)->post("/api/admin/brands/{$brand->id}/logo", [
            'logo' => UploadedFile::fake()->image('logo.png', 200, 200),
        ], ['Accept' => 'application/json'])->assertOk();

        $firstPath = $brand->fresh()->logo_path;
        Storage::disk('public')->assertExists($firstPath);
        $this->assertStringContainsString('brands/', $firstPath);
        $this->assertNotNull($first->json('data.logo_url'));

        $this->actingAs($admin)->post("/api/admin/brands/{$brand->id}/logo", [
            'logo' => UploadedFile::fake()->image('new.jpg', 200, 200),
        ], ['Accept' => 'application/json'])->assertOk();
        Storage::disk('public')->assertMissing($firstPath);
        $secondPath = $brand->fresh()->logo_path;
        Storage::disk('public')->assertExists($secondPath);

        $this->actingAs($admin)->deleteJson("/api/admin/brands/{$brand->id}/logo")
            ->assertOk()
            ->assertJsonPath('data.logo_url', null);
        Storage::disk('public')->assertMissing($secondPath);
    }

    public function test_a_logo_must_be_an_image(): void
    {
        Storage::fake('public');
        $brand = Brand::factory()->create();

        $this->actingAs($this->admin())->post("/api/admin/brands/{$brand->id}/logo", [
            'logo' => UploadedFile::fake()->create('notes.pdf', 10, 'application/pdf'),
        ], ['Accept' => 'application/json'])->assertUnprocessable()->assertJsonValidationErrors('logo');
    }

    public function test_deleting_an_empty_brand_removes_its_logo_file(): void
    {
        Storage::fake('public');
        $brand = Brand::factory()->create();
        $this->actingAs($this->admin())->post("/api/admin/brands/{$brand->id}/logo", [
            'logo' => UploadedFile::fake()->image('logo.png'),
        ], ['Accept' => 'application/json']);
        $path = $brand->fresh()->logo_path;

        $this->actingAs($this->admin())->deleteJson("/api/admin/brands/{$brand->id}")->assertOk();

        Storage::disk('public')->assertMissing($path);
    }

    public function test_a_product_can_be_given_a_brand_and_have_it_removed(): void
    {
        $admin = $this->admin();
        $brand = Brand::factory()->create();
        $product = Product::factory()->create();

        $payload = fn (?int $brandId) => [
            'category_id' => $product->category_id, 'name' => $product->name,
            'price_pence' => $product->price_pence, 'brand_id' => $brandId,
        ];

        $this->actingAs($admin)->putJson("/api/admin/products/{$product->id}", $payload($brand->id))
            ->assertOk()
            ->assertJsonPath('data.brand_id', $brand->id)
            ->assertJsonPath('data.brand.name', $brand->name);

        $this->actingAs($admin)->putJson("/api/admin/products/{$product->id}", $payload(null))
            ->assertJsonPath('data.brand_id', null);

        $this->actingAs($admin)->putJson("/api/admin/products/{$product->id}", $payload(9999))
            ->assertJsonValidationErrors('brand_id');
    }

    public function test_deleting_a_brand_never_deletes_products_it_only_unbrands_them(): void
    {
        $brand = Brand::factory()->create();
        $product = Product::factory()->create(['brand_id' => $brand->id]);

        // The API refuses while products exist; at the database level the FK still protects the product.
        $brand->delete();

        $this->assertNull($product->fresh()->brand_id);
        $this->assertDatabaseHas('products', ['id' => $product->id]);
    }
}
