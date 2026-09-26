<?php

return [

    // UK VAT rate applied at checkout (PRD §4.4 / FR-13).
    'vat_rate' => (float) env('VAT_RATE', 0.20),

    // The shop's business timezone. Storage stays UTC (config/app.php), but
    // anything a founder thinks of in wall-clock terms — a sale "starting at
    // midnight on 1 Dec", a "Monday deal", a day's takings on the analytics
    // chart — is evaluated in this zone so it flips at UK midnight, BST or not.
    'timezone' => env('SHOP_TIMEZONE', 'Europe/London'),

];
