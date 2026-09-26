<x-mail::message>
# Still thinking it over?

You left these in your cart:

@foreach ($cart->items as $item)
- {{ $item->variant->product->name }} ({{ $item->variant->size }} {{ $item->variant->colour }}) × {{ $item->quantity }}
@endforeach

<x-mail::button :url="config('services.frontend.url').'/cart'">
Return to your cart
</x-mail::button>

Thanks for shopping with MAI_ISHA.
</x-mail::message>
