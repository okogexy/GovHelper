@extends('layouts.app')
@section('title','Результат операции · GOVHelper')
@section('content')
<section class="checkout-result">
    <span class="checkout-pin"></span><small>ФИНАНСОВОЕ ДОСЬЕ · {{ $payment->order_id }}</small>
    @if($payment->status === 'succeeded')<h1>Доступ открыт</h1><p>Подписка {{ $payment->plan->name }} активирована.</p>@else<h1>Оплата не завершена</h1><p>Статус операции: {{ $payment->status }}. Если вы оплатили счёт, обновите страницу через минуту.</p>@endif
    @if($licenseKey)<div class="license-reveal"><small>СОХРАНИТЕ КЛЮЧ · ОН ПОКАЗАН ОДИН РАЗ</small><code>{{ $licenseKey }}</code></div>@endif
    <div><a href="{{ route('dashboard.subscription') }}">Открыть подписку</a><a href="{{ route('pricing') }}">К тарифам</a></div>
</section>
@endsection
