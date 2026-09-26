<x-mail::message>
# Back in stock

**{{ $product->name }}** is available again — stock is limited, so grab it while you can.

<x-mail::button :url="config('services.frontend.url').'/product/'.$product->slug">
Shop now
</x-mail::button>

Thanks for shopping with MAI_ISHA.
</x-mail::message>
