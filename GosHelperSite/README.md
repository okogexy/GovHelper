# VEYRON · GOVHelper

Интерактивная продуктовая презентация настольного помощника для Majestic RP. Laravel отвечает за маршрутизацию и выдачу релиза, React — за интерфейс и scroll-анимации.

## Установка

```bash
composer install
cp .env.example .env
php artisan key:generate
npm install
npm run build
php artisan serve
```

## Разработка

```bash
npm run dev
php artisan serve
```

## Релизы Windows

Поместите установщик в `storage/app/releases` и укажите имя, версию, размер и SHA-256 в `.env`. Если файла нет, интерфейс показывает состояние «Скоро доступно».

## Админ-панель и оплаты

- Панель управления: `/admin`; `admin` может изменять данные, `support` имеет режим просмотра.
- В разделе «Платежи» тестовый режим выдаёт Plus без внешней оплаты.
- Для боевого режима укажите ENOT Shop ID, секретный API-ключ и дополнительный webhook-ключ. Ключи хранятся зашифрованными.
- Webhook ENOT: `https://ваш-домен/webhooks/enot`. Для корректных ссылок задайте публичный HTTPS `APP_URL`.
- После обновления выполните `php artisan migrate --force`.

## Структура

- `resources/js/components` — сцены и компоненты окна GOVHelper;
- `resources/css` — токены, базовые стили, сцены и адаптивность;
- `resources/views/home.blade.php` — HTML и SEO;
- `config/govhelper.php` — метаданные релиза;
- `routes/web.php` — главная страница и скачивание.
