<?php

namespace App\Services;

class SafeCsv
{
    /**
     * Customer-supplied text (a name, an email) ends up as a cell in a CSV a
     * founder opens in a spreadsheet — a value like "=HYPERLINK(...)" would run
     * as a formula there. A leading apostrophe makes Excel/Sheets treat the
     * whole cell as plain text instead. Used by every admin CSV export.
     */
    public static function cell(?string $value): string
    {
        $value ??= '';

        return $value !== '' && str_contains("=+-@\t\r", $value[0]) ? "'{$value}" : $value;
    }

    public static function pounds(int $pence): string
    {
        return number_format($pence / 100, 2, '.', '');
    }
}
