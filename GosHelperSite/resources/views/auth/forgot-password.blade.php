@extends('layouts.app')
@section('title', 'Восстановление доступа · GOVHelper')
@section('content')
<section class="investigator-shell investigator-recovery">
    <aside class="investigator-scene">
        <div class="case-index"><span>CODE</span><strong>R-7</strong><small>RECOVERY PROTOCOL</small></div>
        @include('auth.partials.evidence-board', ['variant' => 'recovery'])
        <div class="scene-copy"><span class="scene-kicker">INTERNAL SECURITY</span><h2>Доступ<br><em>не потерян.</em></h2><p>Служба безопасности выпустит временный ключ после проверки вашего адреса.</p></div>
        <div class="scene-status"><span><i></i> КАНАЛ ЗАШИФРОВАН</span><b>PROTOCOL 7-A</b></div>
    </aside>

    <form method="post" action="/forgot-password" class="investigator-panel">@csrf
        <header class="investigator-head"><span>ВОССТАНОВЛЕНИЕ / 03</span><i>SECURE LINE</i><h1>Вернуть<br>доступ</h1><p>Укажите почту из личного дела. Мы отправим защищённую ссылку.</p></header>
        <label class="investigator-field"><span>Служебная почта</span><input type="email" name="email" value="{{ old('email') }}" autocomplete="email" placeholder="detective@agency.com" required autofocus><b>01</b></label>
        @error('email')<div class="investigator-error">ЗАПРОС ОТКЛОНЁН · {{ $message }}</div>@enderror
        <div class="recovery-note"><b>7A</b><p>Ссылка действует ограниченное время и может быть использована только один раз.</p></div>
        <button class="investigator-submit"><span>Запросить новый код</span><b>→</b></button>
        <footer class="investigator-footer"><a href="/login">← Вернуться к авторизации</a><a href="/register">Новое досье</a></footer>
    </form>
</section>
@endsection
