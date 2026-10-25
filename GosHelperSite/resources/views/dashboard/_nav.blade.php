@php
    $items = [
        'overview' => ['Обзор дела', '/dashboard', '01'],
        'subscription' => ['Подписка', '/dashboard/subscription', '02'],
        'license' => ['Лицензия', '/dashboard/license', '03'],
        'devices' => ['Устройства', '/dashboard/devices', '04'],
        'downloads' => ['Материалы', '/dashboard/downloads', '05'],
        'profile' => ['Профиль', '/dashboard/profile', '06'],
        'security' => ['Безопасность', '/dashboard/security', '07'],
    ];
@endphp
<aside class="case-sidebar">
    <div class="case-folder-mark"><span>CASE</span><strong>019</strong><small>PRIVATE ARCHIVE</small></div>
    <div class="case-agent"><b>{{ $initials ?? 'GH' }}</b><div><small>ВЛАДЕЛЕЦ ДЕЛА</small><strong>{{ auth()->user()->name }}</strong></div></div>
    <nav aria-label="Разделы личного кабинета">
        @foreach($items as $key => [$label, $url, $number])
            <a href="{{ $url }}" class="{{ $active === $key ? 'active' : '' }}"><span>{{ $number }}</span>{{ $label }}<i>→</i></a>
        @endforeach
    </nav>
    <form method="post" action="/logout">@csrf<button type="submit">Закрыть дело <span>↗</span></button></form>
    <footer><i></i> SECURE DATABASE<br><span>LOS SANTOS · GOVHELPER</span></footer>
</aside>
