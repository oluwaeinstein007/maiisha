<?php

namespace App\Console\Commands;

use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Process;
use Illuminate\Support\Facades\Storage;
use RuntimeException;

/**
 * Daily off-server database backup (PRD §7.2 / NFR-7): a droplet failure or
 * redeploy must not be able to lose data, so this dumps the production
 * Postgres database and uploads it to DigitalOcean Spaces (the "s3" disk,
 * S3-compatible) independent of the app server's own disk. Scheduled daily
 * in routes/console.php.
 */
#[Signature('db:backup {--retention-days=30 : Delete backups on the remote disk older than this}')]
#[Description('Dump the database and upload it to off-server object storage')]
class BackupDatabase extends Command
{
    public function handle(): int
    {
        $connection = config('database.default');
        $filename = 'backups/'.config('app.name').'-'.$connection.'-'.now()->format('Y-m-d_His').'.sql.gz';

        try {
            $dump = match ($connection) {
                'pgsql' => $this->dumpPostgres(),
                'sqlite' => $this->dumpSqlite(),
                default => throw new RuntimeException("No backup strategy for the '{$connection}' connection."),
            };
        } catch (RuntimeException $e) {
            $this->error($e->getMessage());
            Log::error('Database backup failed', ['error' => $e->getMessage()]);

            return self::FAILURE;
        }

        Storage::disk('s3')->put($filename, gzencode($dump));
        $this->info("Backup uploaded: {$filename}");

        $this->pruneOldBackups((int) $this->option('retention-days'));

        return self::SUCCESS;
    }

    private function dumpPostgres(): string
    {
        $config = config('database.connections.pgsql');

        $result = Process::env(['PGPASSWORD' => $config['password']])->run([
            'pg_dump',
            '--no-owner',
            '--no-privileges',
            '-h', $config['host'],
            '-p', (string) $config['port'],
            '-U', $config['username'],
            $config['database'],
        ]);

        if ($result->failed()) {
            throw new RuntimeException('pg_dump failed: '.$result->errorOutput());
        }

        return $result->output();
    }

    private function dumpSqlite(): string
    {
        $path = config('database.connections.sqlite.database');

        if (! is_file($path)) {
            throw new RuntimeException("SQLite database file not found at [{$path}].");
        }

        return file_get_contents($path);
    }

    private function pruneOldBackups(int $retentionDays): void
    {
        $cutoff = now()->subDays($retentionDays);

        foreach (Storage::disk('s3')->files('backups') as $path) {
            if (Storage::disk('s3')->lastModified($path) < $cutoff->timestamp) {
                Storage::disk('s3')->delete($path);
                $this->line("Pruned old backup: {$path}");
            }
        }
    }
}
