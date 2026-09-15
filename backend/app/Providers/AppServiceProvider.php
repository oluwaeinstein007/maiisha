<?php

namespace App\Providers;

use App\Contracts\PaymentGateway;
use App\Contracts\ShippingProvider;
use App\Contracts\SmsProvider;
use App\Services\LogShippingProvider;
use App\Services\LogSmsProvider;
use App\Services\StripePaymentGateway;
use App\Services\VatCalculator;
use Illuminate\Support\ServiceProvider;
use Stripe\StripeClient;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Both providers are logging stand-ins until a courier/SMS contract is
        // signed (PRD §9) — swap the binding here when a real one is ready.
        $this->app->bind(ShippingProvider::class, LogShippingProvider::class);
        $this->app->bind(SmsProvider::class, LogSmsProvider::class);

        $this->app->singleton(StripeClient::class, fn () => new StripeClient(config('services.stripe.secret')));
        $this->app->bind(PaymentGateway::class, StripePaymentGateway::class);

        $this->app->singleton(VatCalculator::class, fn () => new VatCalculator(
            config('commerce.vat_rate')
        ));
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
}
