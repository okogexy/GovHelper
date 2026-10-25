<?php
namespace App\Services;
use App\Models\License;
use App\Models\User;
use Illuminate\Support\Str;
class LicenseService { public function issue(User $user,?int $subscriptionId,int $maxDevices):array{$raw='VGH-'.strtoupper(Str::random(8)).'-'.strtoupper(Str::random(16));$license=License::create(['user_id'=>$user->id,'subscription_id'=>$subscriptionId,'key_prefix'=>substr($raw,0,12),'key_hash'=>$this->hash($raw),'status'=>'active','max_devices'=>$maxDevices]);return [$license,$raw];} public function hash(string $key):string{return hash_hmac('sha256',$key,(string)config('app.key'));} public function verify(License $license,string $key):bool{return hash_equals($license->key_hash,$this->hash($key));} }
