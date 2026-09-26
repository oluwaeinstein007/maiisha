<?php

namespace App\Console\Commands;

use App\Mail\CartReminderMail;
use App\Models\Cart;
use App\Models\Order;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

class SendCartReminders extends Command
{
    protected $signature = 'carts:remind';

    protected $description = 'Email signed-in customers whose cart has sat untouched for 24h (once per cart)';

    public function handle(): int
    {
        $sent = 0;

        Cart::query()
            ->whereNotNull('user_id')
            ->whereNull('reminded_at')
            ->whereBetween('updated_at', [now()->subDays(7), now()->subDay()])
            ->has('items')
            ->with(['user', 'items.variant.product'])
            ->each(function (Cart $cart) use (&$sent) {
                $boughtSince = Order::where('user_id', $cart->user_id)
                    ->whereIn('status', Order::PAID_STATUSES)
                    ->where('created_at', '>', $cart->updated_at)
                    ->exists();

                if (! $boughtSince && $cart->user) {
                    Mail::to($cart->user->email)->send(new CartReminderMail($cart));
                    $sent++;
                }

                $cart->forceFill(['reminded_at' => now()])->save();
            });

        $this->info("Sent {$sent} cart reminder(s).");

        return self::SUCCESS;
    }
}
