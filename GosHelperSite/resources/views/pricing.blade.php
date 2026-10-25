@extends('layouts.app')
@section('title', 'Тарифы · GOVHelper')
@section('content')
<div class="pricing-board">
    <header class="pricing-head pricing-poster-head"><span>АРХИВ GOVHELPER · ДЕЛО № 019</span><h1>{{ $siteSettings['pricing_title'] ?? 'Выбери свою сторону' }}</h1><p>{{ $siteSettings['pricing_subtitle'] ?? 'Две версии. Одна база законов. Никаких скрытых условий.' }}</p></header>
    @if($errors->has('payment'))<div class="admin-alert">{{ $errors->first('payment') }}</div>@endif
    <section class="pricing-grid pricing-grid-two" aria-label="Тарифы GOVHelper">
        @foreach($plans as $index => $plan)<article class="price-card pricing-poster {{ $plan->slug === 'plus' ? 'featured pricing-poster-plus' : 'pricing-poster-standard' }}"><i class="poster-tape" aria-hidden="true"></i><div class="poster-meta"><small>{{ $plan->slug === 'plus' ? 'ОСОБЫЙ ДОСТУП' : 'ОТКРЫТЫЙ ДОСТУП' }}</small><span>№ {{ str_pad($index+1,3,'0',STR_PAD_LEFT) }}</span></div><h2>{{ $plan->name }}</h2><p class="poster-description">{{ $plan->description }}</p><div class="poster-price"><span>{{ $plan->price_monthly ? 'СТОИМОСТЬ ДОСТУПА' : 'СТОИМОСТЬ' }}</span>@if($plan->price_monthly===0)<strong>0 ₽<small>навсегда</small></strong>@else<strong>{{ number_format($plan->price_monthly/100,0,',',' ') }} ₽<small>в месяц</small></strong>@endif</div><div class="poster-rule" aria-hidden="true"><b>✦</b><i></i><b>✦</b></div><ul>@foreach($plan->features as $feature)<li>{{ $feature }}</li>@endforeach</ul>
            @if($plan->price_monthly===0)
                <a class="poster-action" href="{{ auth()->check() ? route('dashboard') : route('register') }}">Забрать Standard</a>
                <span class="poster-stamp">FREE<br>ACCESS</span>
            @else
                @auth
                    <form method="post" action="{{ URL::temporarySignedRoute('checkout.store', now()->addMinutes(15), ['plan' => $plan]) }}">@csrf<button class="poster-action" type="submit">Получить Plus</button></form>
                @else
                    <a class="poster-action" href="{{ route('register') }}">Получить Plus</a>
                @endauth
                <span class="poster-stamp">PLUS<br>ISSUE</span>
            @endif
        </article>@endforeach
    </section><p class="pricing-footnote">{{ $siteSettings['footer_text'] ?? 'VEYRON · GOVHelper — доступ привязан к вашему аккаунту' }}</p>
</div>
@endsection
