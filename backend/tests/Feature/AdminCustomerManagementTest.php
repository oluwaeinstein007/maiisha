<?php

namespace Tests\Feature;

use App\Mail\AdminMessageMail;
use App\Models\Address;
use App\Models\Order;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class AdminCustomerManagementTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        return User::factory()->create(['role' => 'admin']);
    }

    private function paidOrder(User $customer, int $totalPence): Order
    {
        return Order::create([
            'order_number' => 'MAI-'.uniqid(),
            'user_id' => $customer->id,
            'address_id' => Address::factory()->for($customer)->create()->id,
            'status' => Order::STATUS_DELIVERED,
            'subtotal_pence' => $totalPence,
            'vat_pence' => 0,
            'total_pence' => $totalPence,
            'currency' => 'GBP',
        ]);
    }

    public function test_guests_and_customers_cannot_manage_customers(): void
    {
        $target = User::factory()->create(['role' => 'customer']);

        $this->getJson('/api/admin/customers')->assertUnauthorized();

        $customer = User::factory()->create(['role' => 'customer']);
        $this->actingAs($customer)->getJson('/api/admin/customers')->assertForbidden();
        $this->actingAs($customer)->getJson("/api/admin/customers/{$target->id}")->assertForbidden();
    }

    public function test_the_list_shows_customers_with_paid_order_totals_and_can_be_searched(): void
    {
        $admin = $this->admin();
        $ada = User::factory()->create(['role' => 'customer', 'name' => 'Ada Lovelace', 'email' => 'ada@example.com']);
        $this->paidOrder($ada, 5000);
        $this->paidOrder($ada, 2500);
        Order::create([
            'order_number' => 'MAI-UNPAID', 'user_id' => $ada->id,
            'address_id' => Address::factory()->for($ada)->create()->id,
            'status' => Order::STATUS_PENDING_PAYMENT, 'subtotal_pence' => 9999, 'vat_pence' => 0, 'total_pence' => 9999, 'currency' => 'GBP',
        ]);
        $bob = User::factory()->create(['role' => 'customer', 'name' => 'Bob Smith', 'email' => 'bob@example.com']);

        $response = $this->actingAs($admin)->getJson('/api/admin/customers')->assertOk();
        $ada_row = collect($response->json('data'))->firstWhere('email', 'ada@example.com');
        $this->assertSame(2, $ada_row['orders_count'], 'the unpaid order does not count');
        $this->assertSame(7500, $ada_row['total_spent_pence']);

        $searched = $this->actingAs($admin)->getJson('/api/admin/customers?search=bob')->assertOk();
        $this->assertCount(1, $searched->json('data'));
        $this->assertSame('Bob Smith', $searched->json('data.0.name'));
    }

    public function test_an_admin_account_never_appears_in_the_customer_list(): void
    {
        $admin = $this->admin();
        User::factory()->create(['role' => 'admin', 'name' => 'Other Admin']);

        $response = $this->actingAs($admin)->getJson('/api/admin/customers')->assertOk();

        $this->assertFalse(collect($response->json('data'))->contains('name', 'Other Admin'));
    }

    public function test_a_customer_detail_page_includes_their_addresses(): void
    {
        $admin = $this->admin();
        $customer = User::factory()->create(['role' => 'customer']);
        Address::factory()->for($customer)->create(['city' => 'Manchester']);

        $response = $this->actingAs($admin)->getJson("/api/admin/customers/{$customer->id}")->assertOk();

        $this->assertSame('Manchester', $response->json('data.addresses.0.city'));
    }

    public function test_an_admin_id_is_not_a_valid_customer_detail(): void
    {
        $admin = $this->admin();
        $otherAdmin = User::factory()->create(['role' => 'admin']);

        $this->actingAs($admin)->getJson("/api/admin/customers/{$otherAdmin->id}")->assertNotFound();
    }

    public function test_a_customers_orders_are_listed_newest_first_paid_and_unpaid_alike(): void
    {
        $admin = $this->admin();
        $customer = User::factory()->create(['role' => 'customer']);
        $old = $this->paidOrder($customer, 1000);
        $old->forceFill(['created_at' => now()->subDays(5)])->save();
        $unpaid = Order::create([
            'order_number' => 'MAI-UNPAID-2', 'user_id' => $customer->id,
            'address_id' => Address::factory()->for($customer)->create()->id,
            'status' => Order::STATUS_PENDING_PAYMENT, 'subtotal_pence' => 2000, 'vat_pence' => 0, 'total_pence' => 2000, 'currency' => 'GBP',
        ]);

        $response = $this->actingAs($admin)->getJson("/api/admin/customers/{$customer->id}/orders")->assertOk();

        $this->assertSame([$unpaid->order_number, $old->order_number], collect($response->json('data'))->pluck('order_number')->all());
    }

    public function test_the_customer_list_can_be_exported_as_csv(): void
    {
        $admin = $this->admin();
        $ada = User::factory()->create([
            'role' => 'customer', 'name' => 'Ada Lovelace', 'email' => 'ada@example.com', 'phone' => '+447700900001',
        ]);
        $this->paidOrder($ada, 5000);
        $bob = User::factory()->create(['role' => 'customer', 'name' => 'Bob Smith', 'email' => 'bob@example.com']);

        $response = $this->actingAs($admin)->get('/api/admin/customers/export');

        $response->assertOk();
        $response->assertHeader('content-type', 'text/csv; charset=UTF-8');
        $rows = array_map('str_getcsv', explode("\n", trim($response->streamedContent())));
        $this->assertSame(['Name', 'Email', 'Phone', 'Joined', 'Orders (paid)', 'Total spent (£)'], $rows[0]);
        $adaRow = collect($rows)->first(fn ($row) => ($row[1] ?? null) === 'ada@example.com');
        $this->assertSame('Ada Lovelace', $adaRow[0]);
        $this->assertSame('1', $adaRow[4]);
        $this->assertSame('50.00', $adaRow[5]);
        $this->assertTrue(collect($rows)->contains(fn ($row) => ($row[1] ?? null) === 'bob@example.com'));
    }

    public function test_the_customer_export_respects_the_search_filter(): void
    {
        $admin = $this->admin();
        User::factory()->create(['role' => 'customer', 'name' => 'Ada Lovelace', 'email' => 'ada@example.com']);
        User::factory()->create(['role' => 'customer', 'name' => 'Bob Smith', 'email' => 'bob@example.com']);

        $response = $this->actingAs($admin)->get('/api/admin/customers/export?search=bob');

        $rows = array_map('str_getcsv', explode("\n", trim($response->streamedContent())));
        $this->assertCount(2, $rows);
        $this->assertSame('bob@example.com', $rows[1][1]);
    }

    public function test_guests_and_customers_cannot_export_customers(): void
    {
        $this->get('/api/admin/customers/export')->assertUnauthorized();

        $customer = User::factory()->create(['role' => 'customer']);
        $this->actingAs($customer)->get('/api/admin/customers/export')->assertForbidden();
    }

    public function test_an_admin_can_email_a_customer(): void
    {
        Mail::fake();
        $admin = $this->admin();
        $customer = User::factory()->create(['role' => 'customer', 'email' => 'customer@example.com']);

        $this->actingAs($admin)->postJson("/api/admin/customers/{$customer->id}/message", [
            'subject' => 'About your order',
            'message' => "Hi, just checking in about your recent order.\nThanks!",
        ])->assertOk()->assertJson(['message' => 'Message sent.']);

        Mail::assertSent(AdminMessageMail::class, function (AdminMessageMail $mail) use ($customer) {
            return $mail->hasTo($customer->email)
                && $mail->subjectLine === 'About your order'
                && $mail->customer->is($customer);
        });
    }

    public function test_sending_a_message_is_validated(): void
    {
        $admin = $this->admin();
        $customer = User::factory()->create(['role' => 'customer']);

        $this->actingAs($admin)->postJson("/api/admin/customers/{$customer->id}/message", [])
            ->assertJsonValidationErrors(['subject', 'message']);
    }

    public function test_cannot_message_an_admin_account(): void
    {
        $admin = $this->admin();
        $otherAdmin = User::factory()->create(['role' => 'admin']);

        $this->actingAs($admin)->postJson("/api/admin/customers/{$otherAdmin->id}/message", [
            'subject' => 'x', 'message' => 'x',
        ])->assertNotFound();
    }
}
