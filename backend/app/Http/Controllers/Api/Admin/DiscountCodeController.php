<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\DiscountCode;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class DiscountCodeController extends Controller
{
    public function index()
    {
        return DiscountCode::withCount('usages')->latest()->get();
    }

    public function store(Request $request)
    {
        $this->normalizeCode($request);
        $data = $this->validated($request);

        return DiscountCode::create($data);
    }

    public function show(DiscountCode $discount_code)
    {
        return $discount_code->loadCount('usages');
    }

    public function update(Request $request, DiscountCode $discount_code)
    {
        $this->normalizeCode($request);
        $data = $this->validated($request, $discount_code->id);
        $discount_code->update($data);

        return $discount_code;
    }

    /** Codes are matched case-insensitively at checkout, so store/validate them consistently uppercased. */
    private function normalizeCode(Request $request): void
    {
        if ($request->filled('code')) {
            $request->merge(['code' => strtoupper($request->string('code'))]);
        }
    }

    public function destroy(DiscountCode $discount_code)
    {
        $discount_code->update(['is_active' => false]);

        return response()->json(['message' => 'Discount code deactivated.']);
    }

    private function validated(Request $request, ?int $ignoreId = null): array
    {
        return $request->validate([
            'code' => ['required', 'string', 'max:50', 'unique:discount_codes,code,'.$ignoreId],
            'type' => ['required', 'in:percentage,fixed'],
            'value' => [
                'required', 'integer', 'min:1',
                Rule::when($request->input('type') === 'percentage', ['max:100']),
            ],
            'usage_limit' => ['nullable', 'integer', 'min:1'],
            'expires_at' => ['nullable', 'date'],
            'is_active' => ['sometimes', 'boolean'],
        ]);
    }
}
