<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;
class License extends Model { protected $guarded=['id']; protected $hidden=['key_hash']; protected function casts(): array { return ['expires_at'=>'datetime','last_used_at'=>'datetime']; } protected static function booted(): void { static::creating(fn($m)=>$m->public_id??=(string)Str::uuid()); } public function user():BelongsTo{return $this->belongsTo(User::class);} public function subscription():BelongsTo{return $this->belongsTo(Subscription::class);} public function devices():HasMany{return $this->hasMany(DeviceActivation::class);} public function isValid():bool{return $this->status==='active'&&(!$this->expires_at||$this->expires_at->isFuture());} }
