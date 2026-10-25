<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <meta name="description" content="{{ $siteSettings['site_description'] }}">
    <meta name="theme-color" content="#080a0a">
    <meta property="og:title" content="{{ $siteSettings['site_title'] }}">
    <meta property="og:description" content="{{ $siteSettings['site_description'] }}">
    <meta property="og:type" content="website">
    <link rel="canonical" href="{{ url('/') }}">
    <link rel="icon" href="/favicon.svg" type="image/svg+xml">
    <title>{{ $siteSettings['site_title'] }}</title>
    @viteReactRefresh
    @vite(['resources/css/app.css', 'resources/js/app.jsx'])
</head>
<body>
    <div id="root" data-release='@json(["available" => false])' data-settings='@json($siteSettings)' data-user='@json(["signedIn" => auth()->check(), "admin" => auth()->user()?->isAdmin() ?? false])'></div>
</body>
</html>
