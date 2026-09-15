<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class BackupDatabaseTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_uploads_a_sqlite_backup_to_the_s3_disk(): void
    {
        Storage::fake('s3');
        // phpunit.xml points the app at an in-memory sqlite DB for speed, but there's
        // nothing on disk to back up in that mode — point at a real temp file instead.
        $tempDb = tempnam(sys_get_temp_dir(), 'maiisha-backup-test').'.sqlite';
        file_put_contents($tempDb, 'fake sqlite bytes');
        config(['database.connections.sqlite.database' => $tempDb]);

        $this->artisan('db:backup')->assertSuccessful();

        @unlink($tempDb);

        $files = Storage::disk('s3')->files('backups');
        $this->assertCount(1, $files);
        $this->assertStringContainsString('sqlite', $files[0]);
        $this->assertStringEndsWith('.sql.gz', $files[0]);
    }

    public function test_it_prunes_backups_older_than_the_retention_window(): void
    {
        Storage::fake('s3');
        Storage::disk('s3')->put('backups/old-backup.sql.gz', 'stale data');
        touch(Storage::disk('s3')->path('backups/old-backup.sql.gz'), now()->subDays(90)->timestamp);

        $tempDb = tempnam(sys_get_temp_dir(), 'maiisha-backup-test').'.sqlite';
        file_put_contents($tempDb, 'fake sqlite bytes');
        config(['database.connections.sqlite.database' => $tempDb]);

        $this->artisan('db:backup', ['--retention-days' => 30])->assertSuccessful();

        @unlink($tempDb);

        $files = Storage::disk('s3')->files('backups');
        $this->assertNotContains('backups/old-backup.sql.gz', $files);
        $this->assertCount(1, $files, 'only the fresh backup just created should remain');
    }
}
