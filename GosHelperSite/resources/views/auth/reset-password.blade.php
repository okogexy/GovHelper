@extends('layouts.app')
@section('title', 'Новый пароль · GOVHelper')
@section('content')
<section class="auth-crime-shell auth-crime-recovery">
    <form method="post" action="/reset-password" class="auth-form crime-paper crime-form">@csrf
        <input type="hidden" name="token" value="{{ $token }}">
        <i class="crime-tape" aria-hidden="true"></i>
        <header class="crime-form-head"><span>СМЕНА КЛЮЧА · ФИНАЛЬНЫЙ ЭТАП</span><b>NEW KEY</b><h1>Новый пароль</h1><p>Назначьте новый ключ доступа к личному делу.</p></header>
        <label class="crime-field"><span>01 / EMAIL</span><input type="email" name="email" value="{{ $email }}" autocomplete="email" required></label>
        <label class="crime-field"><span>02 / НОВЫЙ ПАРОЛЬ</span><input type="password" name="password" autocomplete="new-password" required></label>
        <label class="crime-field"><span>03 / ПОВТОРИТЕ ПАРОЛЬ</span><input type="password" name="password_confirmation" autocomplete="new-password" required></label>
        @if($errors->any())<div class="crime-error">КЛЮЧ НЕ ПРИНЯТ · {{ $errors->first() }}</div>@endif
        <button class="crime-submit">Сохранить новый ключ</button>
        <footer class="crime-form-links"><a href="/login">← Вернуться ко входу</a></footer>
        <span class="crime-stamp">KEY<br>ISSUED</span>
    </form>
    <aside class="crime-briefing"><span>ПРОТОКОЛ БЕЗОПАСНОСТИ</span><h2>Последний шаг.</h2><p>После сохранения старый пароль перестанет действовать.</p><b class="briefing-mark">KEY</b></aside>
</section>
@endsection
