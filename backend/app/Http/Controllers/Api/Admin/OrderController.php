<?php

namespace App\Http\Controllers\Api\Admin;

use App\Contracts\ShippingProvider;
use App\Http\Controllers\Controller;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use App\Services\OrderNotifier;
use Illuminate\Http\Request;

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
