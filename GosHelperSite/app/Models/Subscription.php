<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
class Subscription extends Model { protected $guarded = ['id']; protected function casts(): array { return ['starts_at'=>'datetime','trial_ends_at'=>'datetime','renews_at'=>'datetime','ends_at'=>'datetime','cancel_at_period_end'=>'boolean']; } public function user(): BelongsTo { return $this->belongsTo(User::class); } public function plan(): BelongsTo { return $this->belongsTo(Plan::class); } public function license(): HasOne { return $this->hasOne(License::class); } public function isEntitled(): bool { return in_array($this->status,['trialing','active'],true) && (!$this->ends_at || $this->ends_at->isFuture()); } }
