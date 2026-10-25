@extends('layouts.app')
@section('title', 'Вход · GOVHelper')
@section('content')
<section class="investigator-shell investigator-login">
    <aside class="investigator-scene">
        <div class="case-index"><span>CASE</span><strong>019</strong><small>MAJESTIC STATE ARCHIVE</small></div>
        @include('auth.partials.evidence-board', ['variant' => 'login'])
        <div class="scene-copy"><span class="scene-kicker">PRIVATE INVESTIGATION BUREAU</span><h2>Каждая улика<br><em>имеет значение.</em></h2><p>Закрытый доступ к базе законов, досье и рабочим материалам следователя.</p></div>
        <div class="scene-status"><span><i></i> СИСТЕМА ЗАЩИЩЕНА</span><b>LOS SANTOS · 02:19</b></div>
    </aside>

    <form method="post" action="/login" class="investigator-panel">@csrf
        <header class="investigator-head"><span>АВТОРИЗАЦИЯ / 01</span><i>RESTRICTED</i><h1>Вернуться<br>к делу</h1><p>Введите данные служебного профиля.</p></header>
        <label class="investigator-field"><span>Служебная почта</span><input type="email" name="email" value="{{ old('email') }}" autocomplete="email" placeholder="detective@agency.com" required autofocus><b>01</b></label>
        <label class="investigator-field"><span>Код доступа</span><input type="password" name="password" autocomplete="current-password" placeholder="••••••••••" required><b>02</b></label>
        <div class="investigator-options"><label><input type="checkbox" name="remember" value="1"><span>Запомнить устройство</span></label><a href="/forgot-password">Восстановить код</a></div>
        @error('email')<div class="investigator-error">ДОСТУП ОТКЛОНЁН · {{ $message }}</div>@enderror
        <button class="investigator-submit"><span>Открыть архив</span><b>→</b></button>
        <footer class="investigator-footer"><span>Нет личного дела?</span><a href="/register">Зарегистрировать профиль</a></footer>
    </form>
</section>
@endsection
