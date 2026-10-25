<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class Plan extends Model { protected $fillable = ['slug','name','description','price_monthly','price_yearly','currency','trial_days','device_limit','features','is_active','sort_order']; protected function casts(): array { return ['features'=>'array','is_active'=>'boolean']; } }
