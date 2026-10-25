<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Schema;

class SiteSetting extends Model
{
    protected $fillable = ['key', 'value', 'group', 'updated_by'];

    public const DEFAULTS = [
        'brand_name' => 'VEYRON',
        'product_name' => 'GOVHelper',
        'site_title' => 'VEYRON · GOVHelper',
        'site_description' => 'Кодексы, наказания, процессуальные подсказки и заметки для Majestic RP.',
        'tagline' => 'Законы под рукой. Игра остаётся в фокусе.',
        'nav_context' => 'Поиск · AI · Кодексы · Заметки',
        'server_count' => '19',
        'pricing_title' => 'Выбери свою сторону',
        'pricing_subtitle' => 'Две версии. Одна база законов. Никаких скрытых условий.',
        'support_email' => 'support@example.com',
        'announcement' => '',
        'footer_text' => 'Независимый неофициальный проект.',
        'maintenance_mode' => '0',
    ];

    public static function values(): array
    {
        if (! Schema::hasTable('site_settings')) {
            return self::DEFAULTS;
        }

        return Cache::remember('site-settings.values', 300, fn () => array_replace(
            self::DEFAULTS,
            self::query()->pluck('value', 'key')->all(),
        ));
    }

    public static function putMany(array $values, ?int $userId = null): void
    {
        foreach ($values as $key => $value) {
            if (! array_key_exists($key, self::DEFAULTS)) {
                continue;
            }
            self::query()->updateOrCreate(['key' => $key], [
                'value' => (string) $value,
                'group' => in_array($key, ['pricing_title', 'pricing_subtitle'], true) ? 'pricing' : 'general',
                'updated_by' => $userId,
            ]);
        }
        Cache::forget('site-settings.values');
    }
}
