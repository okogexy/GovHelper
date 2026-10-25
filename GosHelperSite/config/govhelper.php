<?php

return [
    'auto_verify_local' => (bool) env('GOVHELPER_LOCAL_AUTO_VERIFY', env('APP_ENV', 'production') === 'local'),
    'release' => [
        'version' => env('GOVHELPER_VERSION', '1.0.0'),
        'size' => env('GOVHELPER_SIZE', 'Скоро доступно'),
        'updated_at' => env('GOVHELPER_UPDATED_AT', '2026-07-13'),
        'sha256' => env('GOVHELPER_SHA256'),
        'filename' => env('GOVHELPER_FILENAME', 'VEYRON-GOVHelper-Setup.exe'),
    ],
];
