<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;
class DeviceActivation extends Model { protected $guarded=['id']; protected $hidden=['device_hash','last_ip']; protected function casts():array{return ['activated_at'=>'datetime','last_seen_at'=>'datetime','revoked_at'=>'datetime'];} protected static function booted():void{static::creating(fn($m)=>$m->public_id??=(string)Str::uuid());} public function license():BelongsTo{return $this->belongsTo(License::class);} }
