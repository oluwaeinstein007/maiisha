<?php

use App\Http\Controllers\Api\AddressController;
use App\Http\Controllers\Api\Admin\AnalyticsController as AdminAnalyticsController;
use App\Http\Controllers\Api\Admin\BrandController as AdminBrandController;
use App\Http\Controllers\Api\Admin\CategoryController as AdminCategoryController;
use App\Http\Controllers\Api\Admin\CustomerController as AdminCustomerController;
use App\Http\Controllers\Api\Admin\DashboardController as AdminDashboardController;
use App\Http\Controllers\Api\Admin\DemandController as AdminDemandController;
use App\Http\Controllers\Api\Admin\DiscountCodeController as AdminDiscountCodeController;
use App\Http\Controllers\Api\Admin\InventoryController as AdminInventoryController;
use App\Http\Controllers\Api\Admin\NotificationController as AdminNotificationController;
use App\Http\Controllers\Api\Admin\OrderController as AdminOrderController;
use App\Http\Controllers\Api\Admin\ProductController as AdminProductController;
use App\Http\Controllers\Api\Admin\ProductImageController as AdminProductImageController;
use App\Http\Controllers\Api\Admin\ProductVariantController as AdminProductVariantController;
use App\Http\Controllers\Api\Admin\ReviewController as AdminReviewController;
use App\Http\Controllers\Api\Admin\SaleController as AdminSaleController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BrandController;
use App\Http\Controllers\Api\CartController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\CheckoutController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\PasswordResetController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\ReviewController;
use App\Http\Controllers\Api\SaleController;
use App\Http\Controllers\Api\StockAlertController;
use App\Http\Controllers\Api\StripeWebhookController;
use App\Http\Controllers\Api\WishlistController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// --- Public ---

Route::get('/categories', [CategoryController::class, 'index']);
Route::get('/categories/{slug}', [CategoryController::class, 'show']);

Route::get('/products', [ProductController::class, 'index']);
Route::get('/products/filters', [ProductController::class, 'filters']);
Route::get('/products/{slug}', [ProductController::class, 'show']);
Route::get('/products/{slug}/related', [ProductController::class, 'related']);

Route::get('/products/{slug}/reviews', [ReviewController::class, 'index']);
Route::post('/products/{slug}/stock-alert', [StockAlertController::class, 'store'])->middleware('throttle:10,1');

Route::get('/sales/active', [SaleController::class, 'active']);

Route::get('/brands', [BrandController::class, 'index']);
Route::get('/brands/{slug}', [BrandController::class, 'show']);

// Guest carts are session-keyed (CartController::resolveCart) — same
// no-Origin/no-session crash risk as the auth routes below, guarded the same way.
Route::middleware('stateful.session')->group(function () {
    Route::get('/cart', [CartController::class, 'show']);
    Route::post('/cart/items', [CartController::class, 'store']);
    Route::patch('/cart/items/{item}', [CartController::class, 'update']);
    Route::delete('/cart/items/{item}', [CartController::class, 'destroy']);
});

// Tighter, purpose-specific limits on top of the general "api" throttle — these
// are the classic brute-force/enumeration/spam targets (OWASP A07, NFR-1).
// "stateful.session" turns a request with no matching Origin/Referer (any
// non-browser caller — curl, a bot, a bare API client) into a clean 400
// instead of an unhandled 500 from $request->session() having nothing to call.
Route::middleware(['throttle:auth-attempts', 'stateful.session'])->group(function () {
    Route::post('/auth/register', [AuthController::class, 'register']);
    Route::post('/auth/login', [AuthController::class, 'login']);
});

Route::middleware('throttle:password-reset')->group(function () {
    Route::post('/auth/forgot-password', [PasswordResetController::class, 'sendResetLink']);
    Route::post('/auth/reset-password', [PasswordResetController::class, 'reset']);
});

// Signature-verified (see StripeWebhookController), so it's Stripe's own retry
// traffic, not a caller that needs — or should risk being dropped by — throttling.
Route::withoutMiddleware('throttle:api')
    ->post('/webhooks/stripe', [StripeWebhookController::class, 'handle']);

// --- Authenticated (customer) ---

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', fn (Request $request) => $request->user());
    Route::post('/auth/logout', [AuthController::class, 'logout'])->middleware('stateful.session');
    Route::put('/auth/password', [AuthController::class, 'updatePassword']);

    Route::post('/products/{slug}/reviews', [ReviewController::class, 'store']);

    Route::get('/wishlist', [WishlistController::class, 'index']);
    Route::post('/wishlist', [WishlistController::class, 'store']);
    Route::delete('/wishlist/{product}', [WishlistController::class, 'destroy']);
    Route::get('/wishlist/recommendations', [WishlistController::class, 'recommendations']);

    Route::apiResource('addresses', AddressController::class)->except(['show']);

    Route::post('/checkout/preview', [CheckoutController::class, 'preview']);
    Route::post('/checkout', [CheckoutController::class, 'store']);

    Route::get('/orders', [OrderController::class, 'index']);
    Route::get('/orders/{order}', [OrderController::class, 'show']);
});

// --- Admin ---

Route::middleware(['auth:sanctum', 'admin'])->prefix('admin')->group(function () {
    Route::get('/dashboard', [AdminDashboardController::class, 'index']);
    Route::get('/analytics', [AdminAnalyticsController::class, 'index']);
    Route::get('/analytics/export', [AdminAnalyticsController::class, 'export']);

    Route::get('/notifications', [AdminNotificationController::class, 'index']);
    Route::post('/notifications/read', [AdminNotificationController::class, 'markRead']);

    Route::get('/customers', [AdminCustomerController::class, 'index']);
    // Before the {customer} routes: otherwise "export" is parsed as an id and 404s.
    Route::get('/customers/export', [AdminCustomerController::class, 'export']);
    Route::get('/customers/{customer}', [AdminCustomerController::class, 'show']);
    Route::get('/customers/{customer}/orders', [AdminCustomerController::class, 'orders']);
    Route::post('/customers/{customer}/message', [AdminCustomerController::class, 'sendMessage']);

    Route::get('/inventory', [AdminInventoryController::class, 'index']);

    Route::apiResource('categories', AdminCategoryController::class)->except(['show']);

    Route::apiResource('products', AdminProductController::class);
    Route::post('/products/{product}/variants', [AdminProductVariantController::class, 'store']);
    Route::put('/variants/{variant}', [AdminProductVariantController::class, 'update']);
    Route::post('/variants/{variant}/restock', [AdminProductVariantController::class, 'restock']);
    Route::delete('/variants/{variant}', [AdminProductVariantController::class, 'destroy']);
    Route::post('/products/{product}/images', [AdminProductImageController::class, 'store']);
    Route::patch('/images/{image}', [AdminProductImageController::class, 'update']);
    Route::delete('/images/{image}', [AdminProductImageController::class, 'destroy']);

    Route::get('/orders', [AdminOrderController::class, 'index']);
    Route::get('/orders/{order}', [AdminOrderController::class, 'show']);
    Route::patch('/orders/{order}/status', [AdminOrderController::class, 'updateStatus']);
    Route::post('/orders/{order}/refund', [AdminOrderController::class, 'refund']);

    Route::apiResource('discount-codes', AdminDiscountCodeController::class);
    Route::apiResource('sales', AdminSaleController::class);
    Route::post('/sales/{sale}/activate', [AdminSaleController::class, 'activate']);

    Route::get('/reviews', [AdminReviewController::class, 'index']);
    Route::delete('/reviews/{review}', [AdminReviewController::class, 'destroy']);
    Route::get('/demand', [AdminDemandController::class, 'index']);

    Route::apiResource('brands', AdminBrandController::class);
    Route::post('/brands/{brand}/logo', [AdminBrandController::class, 'storeLogo']);
    Route::delete('/brands/{brand}/logo', [AdminBrandController::class, 'destroyLogo']);
});
