@extends('layouts.app')
@section('title', 'Регистрация · GOVHelper')
@section('content')
<section class="investigator-shell investigator-register">
    <aside class="investigator-scene">
        <div class="case-index"><span>FILE</span><strong>NEW</strong><small>IDENTITY CLEARANCE</small></div>
        @include('auth.partials.evidence-board', ['variant' => 'register'])
        <div class="scene-copy"><span class="scene-kicker">PERSONNEL DIVISION</span><h2>Создайте<br><em>личное дело.</em></h2><p>Один защищённый профиль для лицензии, устройств и материалов GOVHelper.</p></div>
        <div class="scene-status"><span><i></i> НАБОР ОТКРЫТ</span><b>VEYRON BUREAU</b></div>
    </aside>

    <form method="post" action="/register" class="investigator-panel">@csrf
        <header class="investigator-head"><span>НОВОЕ ДОСЬЕ / 02</span><i>ENROLLMENT</i><h1>Вступить<br>в бюро</h1><p>Заполните карточку нового сотрудника.</p></header>
        <div class="investigator-grid">
            <label class="investigator-field"><span>Имя сотрудника</span><input name="name" value="{{ old('name') }}" autocomplete="name" placeholder="Имя и фамилия" required autofocus><b>01</b></label>
            <label class="investigator-field"><span>Служебная почта</span><input type="email" name="email" value="{{ old('email') }}" autocomplete="email" placeholder="detective@agency.com" required><b>02</b></label>
            <label class="investigator-field"><span>Код доступа</span><input type="password" name="password" autocomplete="new-password" placeholder="12+ символов, цифры и спецзнак" minlength="12" required><b>03</b></label>
            <label class="investigator-field"><span>Повторите код</span><input type="password" name="password_confirmation" autocomplete="new-password" placeholder="Введите код ещё раз" required><b>04</b></label>
        </div>
        <div class="investigator-options"><label><input type="checkbox" name="terms" value="1" required><span>Принимаю протокол использования</span></label></div>
        @if($errors->any())<div class="investigator-error">ДОСЬЕ ОТКЛОНЕНО · {{ $errors->first() }}</div>@endif
        <button class="investigator-submit"><span>Зарегистрировать досье</span><b>→</b></button>
        <footer class="investigator-footer"><span>Уже состоите в бюро?</span><a href="/login">Войти в архив</a></footer>
    </form>
</section>
@endsection
