<!doctype html>
<html lang="ru">
<head>
    <meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="csrf-token" content="{{ csrf_token() }}"><meta name="theme-color" content="#070909">
    <title>@yield('title', $siteSettings['site_title'] ?? 'VEYRON · GOVHelper')</title>
    <meta name="description" content="{{ $siteSettings['site_description'] ?? '' }}">
    @vite(['resources/css/app.css'])
</head>
<body>
    <a class="skip-link" href="#main">К содержимому</a>
    <header class="navbar portal-navbar">
        <a href="/" class="brand" aria-label="{{ $siteSettings['product_name'] ?? 'GOVHelper' }} — главная"><svg class="logo-mark" viewBox="0 0 40 40" aria-hidden="true"><rect x="7" y="12" width="25" height="14" rx="7" fill="none" stroke="currentColor" stroke-width="2" transform="rotate(42 20 19)"/><rect x="7" y="12" width="25" height="14" rx="7" fill="none" stroke="var(--gold)" stroke-width="2" transform="rotate(-42 20 19)"/></svg><span><b>{{ $siteSettings['brand_name'] ?? 'VEYRON' }}</b><small>{{ $siteSettings['product_name'] ?? 'GOVHelper' }}</small></span></a>
        <a class="nav-menu-button portal-menu-button" href="/"><span class="portal-menu-plus">+</span>Меню</a><a class="nav-pricing" href="{{ route('pricing') }}">Прайсинг</a><span class="nav-context">{{ $siteSettings['nav_context'] ?? 'Поиск · AI · Кодексы · Заметки' }}</span>
        @auth
            @if(auth()->user()->isAdmin())<a class="nav-login" href="{{ route('admin') }}">Админ</a>@endif
            <a class="nav-login" href="{{ route('dashboard') }}">Кабинет</a>
        @else<a class="nav-login" href="{{ route('login') }}">Войти</a>@endauth
        <a class="nav-servers" href="/#servers"><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="6" cy="6" r="2"/><circle cx="14" cy="6" r="2"/><circle cx="6" cy="14" r="2"/><circle cx="14" cy="14" r="2"/></svg><span>{{ $siteSettings['server_count'] ?? 19 }} серверов</span></a>
    </header>
    <main id="main" class="portal-main">@if(session('status'))<div class="form-success" role="status">{{ session('status') }}</div>@endif @yield('content')</main>
</body></html>
