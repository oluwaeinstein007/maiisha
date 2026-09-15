<?php

namespace App\Http\Controllers\Api\Admin;

use App\Contracts\ShippingProvider;
use App\Http\Controllers\Controller;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use App\Services\OrderNotifier;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class OrderController extends Controller
{
    private const VALID_STATUSES = [
        Order::STATUS_PLACED,
        Order::STATUS_PROCESSING,
        Order::STATUS_SHIPPED,
        Order::STATUS_DELIVERED,
        Order::STATUS_CANCELLED,
    ];

    public function index(Request $request)
    {
        $query = Order::query()->with(['user', 'items'])->latest();

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }

        return OrderResource::collection($query->paginate($request->integer('per_page', 20)));
    }

    public function show(Order $order)
    {
        return new OrderResource($order->load(['user', 'address', 'items', 'shipment', 'payment']));
    }

    public function updateStatus(
        Request $request,
        Order $order,
        ShippingProvider $shippingProvider,
        OrderNotifier $notifier,
    ) {
        $data = $request->validate([
            'status' => ['required', 'string', 'in:'.implode(',', self::VALID_STATUSES)],
        ]);

        // Cancelling a paid order must return its stock — otherwise it's decremented
        // forever with no way back, same risk the Stripe webhook's failure path guards
        // against. Only restock once: skip if it was already cancelled.
        if ($data['status'] === Order::STATUS_CANCELLED && $order->status !== Order::STATUS_CANCELLED) {
            DB::transaction(function () use ($order) {
                $order->load('items.variant');

                foreach ($order->items as $item) {
                    $item->variant?->increment('stock_quantity', $item->quantity);
                }

                $order->update(['status' => Order::STATUS_CANCELLED]);
            });

            return new OrderResource($order->fresh(['user', 'address', 'items', 'shipment']));
        }

        $order->update(['status' => $data['status']]);

        if ($data['status'] === Order::STATUS_SHIPPED) {
            if (! $order->shipment) {
                $shipmentData = $shippingProvider->createShipment($order);
                $order->shipment()->create([...$shipmentData, 'status' => 'in_transit']);
            }

            $order->update(['shipped_at' => now()]);
            $notifier->shipped($order->load('items', 'user'));
        }

        if ($data['status'] === Order::STATUS_DELIVERED) {
            $order->update(['delivered_at' => now()]);
            $order->shipment?->update(['status' => 'delivered']);
            $notifier->delivered($order->load('items', 'user'));
        }

        return new OrderResource($order->load(['user', 'address', 'items', 'shipment']));
    }
}
