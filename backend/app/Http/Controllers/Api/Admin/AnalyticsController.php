<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Services\AnalyticsReport;
use App\Services\SafeCsv;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AnalyticsController extends Controller
{
    private const MAX_CUSTOM_RANGE_DAYS = 731;

    public function index(Request $request): JsonResponse
    {
        return response()->json($this->report($request)->build());
    }

    /** Paid orders in the range as a CSV, for the bookkeeper / VAT return. */
    public function export(Request $request): StreamedResponse
    {
        $report = $this->report($request);
        $filename = "maiisha-orders-{$report->from()->toDateString()}-to-{$report->to()->toDateString()}.csv";

        return response()->streamDownload(function () use ($report) {
            $out = fopen('php://output', 'w');

            $write = fn (array $row) => fputcsv($out, $row, ',', '"', '\\');

            $write([
                'Order number', 'Date', 'Customer', 'Email', 'Status', 'Items (£)', 'Discount code',
                'Code discount (£)', 'Shipping (£)', 'VAT included (£)', 'Total (£)', 'Lines bought on sale',
            ]);

            foreach ($report->exportOrders() as $order) {
                $write([
                    $order->order_number,
                    $order->created_at->copy()->setTimezone($report->timezone())->format('Y-m-d H:i'),
                    SafeCsv::cell($order->user?->name),
                    SafeCsv::cell($order->user?->email),
                    $order->status,
                    SafeCsv::pounds($order->subtotal_pence),
                    SafeCsv::cell($order->discountCode?->code),
                    SafeCsv::pounds($order->discount_pence),
                    SafeCsv::pounds($order->shipping_pence),
                    SafeCsv::pounds($order->vat_pence),
                    SafeCsv::pounds($order->total_pence),
                    $order->sale_items_count,
                ]);
            }

            fclose($out);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    private function report(Request $request): AnalyticsReport
    {
        $data = $request->validate([
            'range' => ['sometimes', Rule::in(AnalyticsReport::RANGES)],
            'from' => ['required_if:range,custom', 'nullable', 'date_format:Y-m-d'],
            'to' => ['required_if:range,custom', 'nullable', 'date_format:Y-m-d', 'after_or_equal:from'],
        ]);

        $range = $data['range'] ?? '30d';

        if ($range === 'custom') {
            // An end date in the future is clamped to today by the report, so the
            // cap has to be judged on the range actually reported, not the one typed.
            $today = CarbonImmutable::now(config('commerce.timezone'))->toDateString();
            $effectiveTo = min($data['to'], $today);

            if (CarbonImmutable::parse($data['from'])->diffInDays(CarbonImmutable::parse($effectiveTo)) >= self::MAX_CUSTOM_RANGE_DAYS) {
                throw ValidationException::withMessages(['to' => 'Choose a range of two years or less.']);
            }
        }

        return new AnalyticsReport($range, $data['from'] ?? null, $data['to'] ?? null);
    }
}
