<?php

namespace Tests\Support;

use Illuminate\Cookie\CookieValuePrefix;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Testing\TestResponse;

/**
 * Laravel's test client re-encrypts whatever you hand withCookies() (it assumes
 * plain values, since that's what a real browser would present on a follow-up
 * request). To replay a Set-Cookie from a previous TestResponse we must first
 * undo the encryption ourselves, or the second request just double-wraps it
 * and the server can't make sense of the result — see EncryptCookies::decrypt().
 */
trait CarriesSessionCookies
{
    protected function plainCookiesFrom(TestResponse $response): array
    {
        $cookies = [];

        foreach ($response->headers->getCookies() as $cookie) {
            $name = $cookie->getName();

            try {
                $decrypted = Crypt::decrypt($cookie->getValue(), false);
                $cookies[$name] = CookieValuePrefix::remove($decrypted);
            } catch (\Throwable) {
                // Not an encrypted cookie (or already plain) — carry it as-is.
                $cookies[$name] = $cookie->getValue();
            }
        }

        return $cookies;
    }
}
