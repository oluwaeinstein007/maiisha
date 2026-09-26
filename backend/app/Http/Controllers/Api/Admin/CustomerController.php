<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\AdminCustomerResource;
use App\Http\Resources\OrderResource;
use App\Mail\AdminMessageMail;
use App\Models\Order;
use App\Models\User;
use App\Services\SafeCsv;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Mail;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Throwable;

class CustomerController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = User::query()->where('role', 'customer')->withOrderStats();

        if ($request->filled('search')) {
            $term = '%'.$request->string('search').'%';
            $query->where(fn ($q) => $q->where('name', 'like', $term)->orWhere('email', 'like', $term));
        }

        return AdminCustomerResource::collection($query->latest()->paginate($request->integer('per_page', 20)));
    }

    /** Every customer matching the current search, as a CSV — a founder's own mailing-list export. */
    public function export(Request $request): StreamedResponse
    {
        $query = User::query()->where('role', 'customer')->withOrderStats();

        if ($request->filled('search')) {
            $term = '%'.$request->string('search').'%';
            $query->where(fn ($q) => $q->where('name', 'like', $term)->orWhere('email', 'like', $term));
        }

        return response()->streamDownload(function () use ($query) {
            $out = fopen('php://output', 'w');
            $write = fn (array $row) => fputcsv($out, $row, ',', '"', '\\');

            $write(['Name', 'Email', 'Phone', 'Joined', 'Orders (paid)', 'Total spent (£)']);

            $query->orderBy('id')->chunk(200, function ($customers) use ($write) {
                foreach ($customers as $customer) {
                    $write([
                        SafeCsv::cell($customer->name),
                        SafeCsv::cell($customer->email),
                        SafeCsv::cell($customer->phone),
                        $customer->created_at->toDateString(),
                        $customer->orders_count,
                        SafeCsv::pounds($customer->total_spent_pence ?? 0),
                    ]);
                }
            });

            fclose($out);
        }, 'maiisha-customers.csv', ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    public function show(User $customer): AdminCustomerResource
    {
        abort_unless($customer->role === 'customer', 404);

        return new AdminCustomerResource(
            User::query()->withOrderStats()->with('addresses')->findOrFail($customer->id)
        );
    }

    /**
     * A one-off email to this customer — a question about an order, a delivery
     * update outside the usual milestones. Not an order-status notification (see
     * OrderNotifier), so it never texts them: an admin can say more than an SMS
     * template allows, and shouldn't need a reason tied to order status to reach out.
     */
    public function sendMessage(Request $request, User $customer): JsonResponse
    {
        abort_unless($customer->role === 'customer', 404);

        $data = $request->validate([
            'subject' => ['required', 'string', 'max:150'],
            'message' => ['required', 'string', 'max:5000'],
        ]);

        try {
            Mail::to($customer->email)->send(new AdminMessageMail($customer, $data['subject'], $data['message']));
        } catch (Throwable $e) {
            report($e);

            return response()->json(['message' => 'Could not send the message. Please try again in a moment.'], 502);
        }

        return response()->json(['message' => 'Message sent.']);
    }

    /**
     * A single customer's orders, for their admin detail page. Paid and unpaid
     * alike — an admin looking at one customer wants their whole history, unlike
     * the dashboard/analytics figures which count paid orders only.
     */
    public function orders(Request $request, User $customer): AnonymousResourceCollection
    {
        abort_unless($customer->role === 'customer', 404);

        $orders = Order::query()
            ->where('user_id', $customer->id)
            ->with(['user', 'items.variant.product.images'])
            ->latest()
            ->paginate($request->integer('per_page', 10));

        return OrderResource::collection($orders);
    }
}
