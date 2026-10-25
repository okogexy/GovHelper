<?php
namespace Tests\Unit;
use App\Models\User;
use App\Services\LicenseService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
class LicenseServiceTest extends TestCase { use RefreshDatabase; public function test_license_is_stored_as_hash_and_can_be_verified():void{$user=User::factory()->create();[$license,$raw]=app(LicenseService::class)->issue($user,null,2);$this->assertStringStartsWith('VGH-',$raw);$this->assertNotSame($raw,$license->key_hash);$this->assertTrue(app(LicenseService::class)->verify($license,$raw));$this->assertFalse(app(LicenseService::class)->verify($license,$raw.'X'));} }
