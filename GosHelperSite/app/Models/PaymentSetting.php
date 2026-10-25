<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PaymentSetting extends Model
{
    protected $fillable = ['provider', 'mode', 'is_enabled', 'shop_id', 'secret_key', 'webhook_secret', 'invoice_expire', 'updated_by'];
    protected $hidden = ['secret_key', 'webhook_secret'];

    protected function casts(): array
    {
        return [
            'is_enabled' => 'boolean',
            'secret_key' => 'encrypted',
            'webhook_secret' => 'encrypted',
            'invoice_expire' => 'integer',
        ];
    }

    public static function enot(): self
    {
        return self::query()->firstOrCreate(['provider' => 'enot'], [
            'mode' => 'test',
            'is_enabled' => app()->isLocal(),
            'invoice_expire' => 60,
        ]);
    }

    public function isReadyForLive(): bool
    {
        return $this->is_enabled && $this->mode === 'live'
            && filled($this->shop_id) && filled($this->secret_key) && filled($this->webhook_secret);
    }

    public function canVerifyWebhook(): bool
    {
        return $this->mode === 'live' && filled($this->webhook_secret);
    }
}
