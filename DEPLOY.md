# Локальная проверка

Из корня проекта запустите `powershell -ExecutionPolicy Bypass -File .\Start-Local.ps1`. Скрипт применит миграции, соберёт сайт, поднимет его на `127.0.0.1:8000`, проверит API и откроет программу. Регистрация выполняется на сайте, затем те же данные используются в программе.

# SSH-релиз

1. Загрузите `GosHelperSite` в `/var/www/govhelper`, создайте production `.env` по `GosHelperSite/deploy/.env.production.example` и задайте новый `APP_KEY` командой `php artisan key:generate`.
2. Настройте Nginx по `GosHelperSite/deploy/nginx.conf.example`, PHP-FPM 8.3+, HTTPS и SMTP.
3. Запускайте `APP_DIR=/var/www/govhelper bash deploy/deploy.sh` после каждой выгрузки.
4. Соберите клиент командой `powershell -File program/Helper/scripts/Build-Production.ps1 -ApiUrl https://ВАШ-ДОМЕН/api/v1/program`.
5. Загрузите `.exe` на сервер и опубликуйте его: `php artisan govhelper:publish /tmp/Veyron-GovHelper.exe 2.1.0 --notes="Первый публичный релиз"`. Команда сама проверит файл, рассчитает SHA-256, сохранит его в закрытое хранилище и активирует релиз.
6. В `/admin/payments` включите боевой режим ENOT и сохраните Shop ID, API-ключ и дополнительный webhook-ключ. В кабинете ENOT укажите webhook `https://ВАШ-ДОМЕН/webhooks/enot`.

Не переносите локальный `.env`, SQLite и `APP_KEY` на публичный сервер. Закройте доступ к `.env`, `storage` и базе, оставив корнем сайта только каталог `public`.
