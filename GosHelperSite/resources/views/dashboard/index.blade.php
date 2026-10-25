@extends('layouts.app')
@section('title', 'Личное дело · GOVHelper')
@section('content')
@php
    $user = auth()->user();
    $subscription = $user->activeSubscription();
    $license = $user->licenses()->where('status', 'active')->first();
    $initials = collect(preg_split('/\s+/u', trim($user->name)))->filter()->take(2)->map(fn ($part) => mb_strtoupper(mb_substr($part, 0, 1)))->join('');
@endphp
<div class="detective-dashboard">
    @include('dashboard._nav', ['active' => 'overview', 'initials' => $initials])

    <section class="case-workspace">
        <header class="case-heading">
            <div>
                <span class="case-kicker">VEYRON INVESTIGATION BUREAU · CASE 019</span>
                <h1>Личное дело<br><em>{{ $user->name }}</em></h1>
                <p>Все данные профиля, лицензии и доступы собраны в одном защищённом архиве.</p>
            </div>
            <div class="case-seal"><b>ДОСТУП</b><strong>РАЗРЕШЁН</strong><small>{{ now()->format('d.m.Y') }}</small></div>
        </header>

        <div class="case-meta-strip">
            <span><i></i> СЕССИЯ ЗАЩИЩЕНА</span>
            <span>ДЕЛО № {{ str_pad((string) $user->id, 4, '0', STR_PAD_LEFT) }}</span>
            <span>ОТДЕЛ · GOVHELPER</span>
        </div>

        <div class="evidence-grid">
            <article class="evidence-card evidence-main">
                <div class="evidence-label"><span>УЛИКА A-01</span><b>ПОДПИСКА</b></div>
                <small>Текущий уровень допуска</small>
                <h2>{{ $subscription?->plan?->name ?? 'Доступ не оформлен' }}</h2>
                <p>{{ $subscription ? 'Статус: '.mb_strtoupper($subscription->status) : 'Выберите тариф, чтобы открыть полный архив возможностей.' }}</p>
                <a href="/pricing">Изучить тарифы <span>→</span></a>
            </article>

            <article class="evidence-card identity-card">
                <div class="evidence-label"><span>УЛИКА B-07</span><b>ЛИЧНОСТЬ</b></div>
                <div class="identity-photo"><strong>{{ $initials ?: 'GH' }}</strong><i>VERIFIED</i></div>
                <div><small>Служебная почта</small><h3>{{ $user->email }}</h3><p>Личность подтверждена</p></div>
            </article>

            <article class="evidence-card license-card">
                <div class="evidence-label"><span>УЛИКА C-12</span><b>ЛИЦЕНЗИЯ</b></div>
                <div class="license-stamp {{ $license ? 'is-active' : '' }}">{{ $license ? 'ACTIVE' : 'MISSING' }}</div>
                <small>Ключ доступа</small>
                <h3>{{ $license?->key_prefix ? $license->key_prefix.'••••' : 'Не выпущен' }}</h3>
                <a href="/dashboard/license">Открыть материалы →</a>
            </article>

            <article class="case-notes">
                <header><span>ОПЕРАТИВНАЯ СВОДКА</span><b>CONFIDENTIAL</b></header>
                <ol>
                    <li class="done"><i></i><div><b>Профиль создан</b><small>Досье внесено в архив</small></div><time>01</time></li>
                    <li class="done"><i></i><div><b>Email подтверждён</b><small>Личность установлена</small></div><time>02</time></li>
                    <li class="{{ $license ? 'done' : '' }}"><i></i><div><b>Лицензия активирована</b><small>{{ $license ? 'Устройство допущено' : 'Ожидает оформления' }}</small></div><time>03</time></li>
                </ol>
            </article>
        </div>
    </section>
</div>
@endsection
