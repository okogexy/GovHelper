<?php

namespace Tests\Feature;

use App\Models\Release;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class PublishReleaseCommandTest extends TestCase
{
    use RefreshDatabase;

    public function test_release_command_hashes_stores_and_activates_executable(): void
    {
        Storage::fake('local');
        $source = storage_path('framework/testing/govhelper-test.exe');
        file_put_contents($source, 'portable-release');
        try {
            $this->artisan('govhelper:publish', ['file' => $source, 'version' => '2.1.0'])->assertSuccessful();
            $release = Release::sole();
            $this->assertTrue($release->is_active);
            $this->assertSame(hash_file('sha256', $source), $release->sha256);
            Storage::disk('local')->assertExists($release->storage_path);
        } finally {
            @unlink($source);
        }
    }
}
