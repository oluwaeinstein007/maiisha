<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Off-server daily DB backup (PRD §7.2 / NFR-7). Runs inside the "scheduler"
// container in docker-compose, which polls `schedule:run` every minute.
Schedule::command('db:backup')->daily()->onOneServer();
