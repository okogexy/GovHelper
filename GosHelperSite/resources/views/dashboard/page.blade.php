@extends('layouts.app')
@php
    $pages = [
        'subscription' => ['Подписка', 'Финансовое досье', '02', 'Управляйте уровнем допуска и сроком действия подписки.'],
        'license' => ['Лицензия', 'Ключ к архиву', '03', 'Данные лицензии хранятся в закрытой части личного дела.'],
        'devices' => ['Устройства', 'Список наблюдения', '04', 'Контролируйте компьютеры, получившие доступ к GOVHelper.'],
        'downloads' => ['Материалы', 'Архив улик', '05', 'Здесь появляются проверенные сборки и обновления программы.'],
        'profile' => ['Профиль', 'Карточка агента', '06', 'Основная информация владельца защищённого аккаунта.'],
        'security' => ['Безопасность', 'Протокол защиты', '07', 'Пароль, активные сессии и контроль доступа к материалам.'],
    ];
    [$title, $eyebrow, $number, $description] = $pages[$page];
    $user = auth()->user();
    $initials = collect(preg_split('/\s+/u', trim($user->name)))->filter()->take(2)->map(fn ($part) => mb_strtoupper(mb_substr($part, 0, 1)))->join('');
@endphp
@section('title', $title.' · GOVHelper')
@section('content')
<div class="detective-dashboard">
    @include('dashboard._nav', ['active' => $page, 'initials' => $initials])
    <section class="case-workspace case-page">
        <header class="case-heading compact">
            <div><span class="case-kicker">РАЗДЕЛ {{ $number }} · {{ mb_strtoupper($eyebrow) }}</span><h1>{{ $title }}</h1><p>{{ $description }}</p></div>
            <div class="page-index"><small>FILE</small><strong>{{ $number }}</strong></div>
        </header>
        <div class="dossier-layout">
            <article class="dossier-sheet">
                <span class="paper-clip"></span>
                <header><small>VEYRON · INTERNAL DOCUMENT</small><b>CLASSIFIED</b></header>
                <div class="dossier-lines"><i></i><i></i><i></i></div>
                <h2>{{ $eyebrow }}</h2>
                <p>{{ $description }}</p>
                @if($page === 'profile')
                    <dl><div><dt>Имя</dt><dd>{{ $user->name }}</dd></div><div><dt>Email</dt><dd>{{ $user->email }}</dd></div><div><dt>Статус</dt><dd>Подтверждён</dd></div></dl>
                @elseif($page === 'subscription')
                    @php($subscription = $user->activeSubscription())
                    <dl><div><dt>Тариф</dt><dd>{{ $subscription?->plan?->name ?? 'Не оформлен' }}</dd></div><div><dt>Статус</dt><dd>{{ $subscription?->status ?? 'Нет доступа' }}</dd></div><div><dt>Действует до</dt><dd>{{ $subscription?->ends_at?->format('d.m.Y') ?? '—' }}</dd></div></dl>
                    @if(!$subscription)<a class="dossier-action" href="{{ route('pricing') }}">Выбрать тариф →</a>@endif
                    <h3 class="dossier-subtitle">Последние операции</h3>
                    <dl>@forelse($user->payments()->with('plan')->latest()->limit(5)->get() as $payment)<div><dt>{{ $payment->created_at->format('d.m.Y') }} · {{ $payment->plan->name }}</dt><dd>{{ number_format($payment->amount/100,0,',',' ') }} ₽ · {{ $payment->status }}</dd></div>@empty<div><dt>Операций нет</dt><dd>—</dd></div>@endforelse</dl>
                @elseif($page === 'license')
                    @php($license = $user->licenses()->where('status', 'active')->first())
                    <dl><div><dt>Состояние</dt><dd>{{ $license ? 'Активна' : 'Не оформлена' }}</dd></div><div><dt>Префикс</dt><dd>{{ $license?->key_prefix ?? '—' }}</dd></div><div><dt>Устройств</dt><dd>{{ $license?->devices()->whereNull('revoked_at')->count() ?? 0 }}</dd></div></dl>
                @else
                    <div class="dossier-empty"><i></i><strong>Материалы готовятся</strong><span>Новые данные появятся здесь автоматически.</span></div>
                @endif
                <footer>CASE 019 / {{ $number }} <span>{{ now()->format('d · m · Y') }}</span></footer>
            </article>
            <aside class="case-pinboard">
                <span class="pin"></span><small>FIELD NOTE</small><h3>Контроль доступа</h3><p>Этот раздел доступен только владельцу аккаунта. Все операции фиксируются системой.</p><b>VERIFIED</b>
            </aside>
        </div>
    </section>
</div>
@endsection
