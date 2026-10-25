<?php

namespace Database\Seeders;

use App\Models\Plan;
use App\Models\PaymentSetting;
use App\Models\SiteSetting;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $plans = [
            [
                'slug' => 'standard', 'name' => 'GOVHelper Standard',
                'description' => 'Базовая версия GOVHelper для повседневной игры.',
                'price_monthly' => 0, 'price_yearly' => 0, 'device_limit' => 1,
                'features' => ['Актуальная база законов', 'Быстрый поиск по статьям', 'Кодексы и справочник', 'Избранное и заметки', 'Все 19 серверов', 'Одно устройство'],
            ],
            [
                'slug' => 'plus', 'name' => 'GOVHelper Plus',
                'description' => 'Расширенная версия для максимального удобства.',
                'price_monthly' => 29900, 'price_yearly' => 299000, 'device_limit' => 2,
                'features' => ['Всё из тарифа Standard', 'AI-помощник', 'Overlay поверх игры', 'Темы Aurora, Midnight и Light', 'Офлайн-база и автообновления', 'Два устройства', 'Приоритетная поддержка'],
            ],
        ];

        foreach ($plans as $sortOrder => $plan) {
            Plan::updateOrCreate(['slug' => $plan['slug']], $plan + [
                'currency' => 'RUB', 'trial_days' => 0, 'is_active' => true, 'sort_order' => $sortOrder,
            ]);
        }

        Plan::whereIn('slug', ['trial', 'team', 'pro'])->update(['is_active' => false]);

        foreach (SiteSetting::DEFAULTS as $key => $value) {
            SiteSetting::firstOrCreate(['key' => $key], ['value' => $value, 'group' => 'general']);
        }
        PaymentSetting::firstOrCreate(['provider' => 'enot'], ['mode' => 'test', 'is_enabled' => app()->isLocal(), 'invoice_expire' => 60]);
    }
}
