<?php

namespace Tests\Feature;

use App\Contracts\SmsProvider;
use App\Mail\OrderStatusMail;
use App\Models\Order;
use App\Models\User;
use App\Services\OrderNotifier;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\Support\FakeSmsProvider;
use Tests\TestCase;

class OrderNotifierTest extends TestCase
{
    use RefreshDatabase;

    private function fakeSms(): FakeSmsProvider
    {
        $fake = new FakeSmsProvider;
        $this->app->instance(SmsProvider::class, $fake);

        return $fake;
    }

    private function makeOrder(User $user): Order
    {
        return Order::create([
            'order_number' => 'MAI-'.$user->id.'-1',
            'user_id' => $user->id,
            'status' => Order::STATUS_PLACED,
            'subtotal_pence' => 1000,
            'vat_pence' => 200,
            'total_pence' => 1200,
        ]);
    }

    public function test_placed_sends_email_and_sms_when_user_has_a_phone(): void
    {
        Mail::fake();
        $sms = $this->fakeSms();

        $user = User::factory()->create(['phone' => '+15559876543']);
        $order = $this->makeOrder($user);

        app(OrderNotifier::class)->placed($order);

        Mail::assertSent(OrderStatusMail::class, fn ($mail) => $mail->hasTo($user->email) && $mail->statusLabel === 'Order placed');

        $this->assertCount(1, $sms->calls);
        $this->assertSame('+15559876543', $sms->calls[0]['toPhoneNumber']);
        $this->assertStringContainsString($order->order_number, $sms->calls[0]['message']);
        $this->assertStringContainsString('Order placed', $sms->calls[0]['message']);
    }

    public function test_notify_skips_sms_when_user_has_no_phone(): void
    {
        Mail::fake();
        $sms = $this->fakeSms();

        $user = User::factory()->create(['phone' => null]);
        $order = $this->makeOrder($user);

        app(OrderNotifier::class)->shipped($order);

        Mail::assertSent(OrderStatusMail::class);
        $this->assertCount(0, $sms->calls);
    }

    public function test_delivered_notifies_with_the_delivered_label(): void
    {
        Mail::fake();
        $sms = $this->fakeSms();

        $user = User::factory()->create(['phone' => '+15559876543']);
        $order = $this->makeOrder($user);

        app(OrderNotifier::class)->delivered($order);

        Mail::assertSent(OrderStatusMail::class, fn ($mail) => $mail->statusLabel === 'Delivered');
        $this->assertStringContainsString('Delivered', $sms->calls[0]['message']);
    }
}
