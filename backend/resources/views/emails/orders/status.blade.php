<x-mail::message>
# Order {{ $order->order_number }}

Your order status is now: **{{ $statusLabel }}**.

<x-mail::table>
| Item | Qty | Price |
| :--- | :-: | ----: |
@foreach ($order->items as $item)
| {{ $item->product_name }} ({{ $item->size }} {{ $item->colour }}) | {{ $item->quantity }} | £{{ number_format($item->line_total_pence / 100, 2) }} |
@endforeach
</x-mail::table>

**Total: £{{ number_format($order->total_pence / 100, 2) }}** (incl. VAT £{{ number_format($order->vat_pence / 100, 2) }})

<x-mail::button :url="config('services.frontend.url').'/account/orders'">
View your order
</x-mail::button>

Thanks for shopping with MAI_ISHA.
</x-mail::message>
