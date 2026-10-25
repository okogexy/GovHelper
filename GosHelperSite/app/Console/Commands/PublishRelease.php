<?php

namespace App\Console\Commands;

use App\Models\Release;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class PublishRelease extends Command
{
    protected $signature = 'govhelper:publish {file : Path to the Windows executable} {version : Release version} {--notes= : Release notes}';

    protected $description = 'Publish a verified GOVHelper Windows release';

    public function handle(): int
    {
        $source = realpath((string) $this->argument('file'));
        if (! $source || ! is_file($source) || strtolower(pathinfo($source, PATHINFO_EXTENSION)) !== 'exe') {
            $this->error('Укажите существующий EXE-файл.');

            return self::FAILURE;
        }
        $version = trim((string) $this->argument('version'));
        if (! preg_match('/^\d+\.\d+\.\d+(?:[-+][A-Za-z0-9.-]+)?$/', $version)) {
            $this->error('Версия должна соответствовать SemVer, например 2.1.0.');

            return self::FAILURE;
        }

        $filename = 'Veyron-GovHelper-'.$version.'-x64.exe';
        $storagePath = 'releases/'.$filename;
        $stream = fopen($source, 'rb');
        if (! $stream || ! Storage::disk('local')->put($storagePath, $stream)) {
            if (is_resource($stream)) {
                fclose($stream);
            }
            $this->error('Не удалось сохранить файл релиза.');

            return self::FAILURE;
        }
        if (is_resource($stream)) {
            fclose($stream);
        }

        DB::transaction(function () use ($source, $version, $filename, $storagePath): void {
            Release::where('channel', 'stable')->where('platform', 'windows')->update(['is_active' => false]);
            Release::create([
                'version' => $version,
                'channel' => 'stable',
                'platform' => 'windows',
                'filename' => $filename,
                'storage_disk' => 'local',
                'storage_path' => $storagePath,
                'size_bytes' => filesize($source),
                'sha256' => hash_file('sha256', $source),
                'release_notes' => $this->option('notes') ?: null,
                'published_at' => now(),
                'is_active' => true,
            ]);
        });

        $this->info("Релиз {$version} опубликован: {$filename}");

        return self::SUCCESS;
    }
}
