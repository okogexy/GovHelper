<?php

namespace App\Models;

use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Str;

class User extends Authenticatable implements MustVerifyEmail
{
    use HasFactory, Notifiable;
    protected $fillable = ['name', 'email', 'password'];
    protected $hidden = ['password', 'remember_token', 'last_login_ip'];
    protected function casts(): array { return ['email_verified_at' => 'datetime', 'last_login_at' => 'datetime', 'password' => 'hashed', 'is_blocked' => 'boolean']; }
    protected static function booted(): void { static::creating(fn (User $user) => $user->public_id ??= (string) Str::uuid()); }
    public function subscriptions(): HasMany { return $this->hasMany(Subscription::class); }
    public function payments(): HasMany { return $this->hasMany(Payment::class); }
    public function licenses(): HasMany { return $this->hasMany(License::class); }
    public function programAccessTokens(): HasMany { return $this->hasMany(ProgramAccessToken::class); }
    public function activeSubscription(): ?Subscription { return $this->subscriptions()->whereIn('status', ['trialing', 'active'])->where(fn ($q) => $q->whereNull('ends_at')->orWhere('ends_at', '>', now()))->latest()->first(); }
    public function isAdmin(): bool { return in_array($this->role, ['admin', 'support'], true); }
}
