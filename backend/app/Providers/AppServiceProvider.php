<?php

namespace App\Providers;

use App\Contracts\PaymentGateway;
use App\Contracts\ShippingProvider;
use App\Contracts\SmsProvider;
use App\Services\LogShippingProvider;
use App\Services\LogSmsProvider;
use App\Services\StripePaymentGateway;
use App\Services\VatCalculator;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
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
        // This is an API-only backend — there's no "password.reset" web route for
        // the default ResetPassword notification to build a link against, so it
        // crashes (RouteNotFoundException) the moment a real user requests one.
        // Point it at the frontend's own reset page instead.
        ResetPassword::createUrlUsing(function ($notifiable, string $token) {
            $email = urlencode($notifiable->getEmailForPasswordReset());

            return rtrim(config('services.frontend.url'), '/')."/reset-password?token={$token}&email={$email}";
        });

        // General API baseline (NFR-1: standard OWASP protections). Auth-sensitive
        // routes layer a tighter, purpose-specific limit on top (see routes/api.php).
        RateLimiter::for('api', function (Request $request) {
            return Limit::perMinute(120)->by($request->user()?->id ?: $request->ip());
        });

        RateLimiter::for('auth-attempts', function (Request $request) {
            return Limit::perMinute(5)->by($request->ip());
        });

        RateLimiter::for('password-reset', function (Request $request) {
            return Limit::perMinute(3)->by($request->ip());
        });
    }
}
