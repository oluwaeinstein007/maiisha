<x-mail::message>
Hi {{ $customer->name }},

{!! nl2br(e($body)) !!}

Thanks,
MAI_ISHA
</x-mail::message>
