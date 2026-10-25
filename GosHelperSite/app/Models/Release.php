<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;
class Release extends Model { protected $guarded=['id']; protected function casts():array{return ['published_at'=>'datetime','is_active'=>'boolean'];} protected static function booted():void{static::creating(fn($m)=>$m->public_id??=(string)Str::uuid());} public function getRouteKeyName():string{return 'public_id';} }
