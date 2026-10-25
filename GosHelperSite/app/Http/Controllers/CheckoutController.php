<?php

namespace App\Http\Controllers;

use App\Models\Payment;
use App\Models\PaymentSetting;
use App\Models\Plan;
use App\Services\EnotPaymentService;
use App\Services\SubscriptionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Validation\ValidationException;
use Illuminate\View\View;

class CheckoutController extends Controller
{
    public function __construct(
        private readonly EnotPaymentService $enot,
        private readonly SubscriptionService $subscriptions,
    ) {}

    public function store(Request $request, Plan $plan): RedirectResponse
    {
        abort_unless($plan->is_active && $plan->price_monthly > 0, 404);
        $settings = PaymentSetting::enot();
        if (! $settings->is_enabled) {
            return back()->withErrors(['payment' => 'Покупки временно отключены.']);
        }

        $active = $request->user()->activeSubscription();
        if ($active?->plan_id === $plan->id && $active->isEntitled()) {
            return redirect()->route('dashboard')->with('status', 'Plus уже активирован на этом аккаунте.');
        }

        if ($settings->mode === 'live') {
            $pending = Payment::query()
                ->where('user_id', $request->user()->id)
                ->where('plan_id', $plan->id)
                ->where('mode', 'live')
                ->where('status', 'pending')
                ->whereNotNull('payment_url')
                ->where('created_at', '>=', now()->subMinutes(15))
                ->latest('id')
                ->first();
            if ($pending) {
                return redirect()->away($pending->payment_url);
            }
        }

        $payment = Payment::create([
            'user_id' => $request->user()->id,
            'plan_id' => $plan->id,
            'provider' => 'enot',
            'mode' => $settings->mode,
            'status' => 'pending',
            'amount' => $plan->price_monthly,
            'currency' => $plan->currency,
        ]);

        if ($settings->mode === 'test') {
            [, $rawKey] = $this->subscriptions->activate($payment);
            return redirect()->route('checkout.success', $payment)
                ->with('status', 'Тестовая подписка активирована.')
                ->with('license_key', $rawKey);
        }

        try {
            $payment = $this->enot->createInvoice($payment, $settings);
        } catch (\Throwable $error) {
            report($error);
            $payment->update(['status' => 'failed']);
            return back()->withErrors(['payment' => 'Не удалось создать счёт. Повторите позже.']);
        }

        return redirect()->away($payment->payment_url);
    }

    public function success(Request $request, Payment $payment): View
    {
        $this->authorizeOwner($request, $payment);
        $rawKey = session('license_key');

        if ($payment->mode === 'live' && $payment->status === 'pending' && $payment->provider_invoice_id) {
            try {
                $data = $this->enot->invoiceInfo($payment, PaymentSetting::enot());
                if (($data['status'] ?? null) === 'success' && $this->matches($payment, $data)) {
                    [, $rawKey] = $this->subscriptions->activate($payment);
                }
            } catch (\Throwable $error) {
                report($error);
            }
        }

        return view('checkout.result', ['payment' => $payment->fresh(), 'licenseKey' => $rawKey]);
    }

    public function fail(Request $request, Payment $payment): View
    {
        $this->authorizeOwner($request, $payment);
        return view('checkout.result', ['payment' => $payment, 'licenseKey' => null]);
    }

    public function webhook(Request $request): JsonResponse
    {
        $settings = PaymentSetting::enot();
        $payload = $request->all();
        if (! $settings->canVerifyWebhook() || ! $this->enot->validWebhookSignature($payload, $request->header('x-api-sha256-signature'), $settings)) {
            return response()->json(['ok' => false], 401);
        }

        $payment = Payment::query()->where('order_id', $payload['order_id'] ?? '')->first();
        if (! $payment || ! $this->matches($payment, $payload)) {
            return response()->json(['ok' => false], 422);
        }

        $payment->update(['provider_payload' => Arr::except($payload, ['signature'])]);
        match ($payload['status'] ?? null) {
            'success' => $this->subscriptions->activate($payment),
            'refund' => $this->subscriptions->refund($payment),
            'fail' => $payment->status === 'pending' ? $payment->update(['status' => 'failed']) : null,
            'expired' => $payment->status === 'pending' ? $payment->update(['status' => 'expired']) : null,
            default => null,
        };

        return response()->json(['ok' => true]);
    }

    private function matches(Payment $payment, array $payload): bool
    {
        $invoice = $payload['invoice_id'] ?? $payload['id'] ?? null;
        $amount = $payload['amount'] ?? $payload['invoice_amount'] ?? null;
        $orderMatches = ! isset($payload['order_id']) || hash_equals($payment->order_id, (string) $payload['order_id']);
        return $orderMatches
            && ($invoice === null || $payment->provider_invoice_id === null || hash_equals($payment->provider_invoice_id, (string) $invoice))
            && isset($amount) && (int) round(((float) $amount) * 100) === $payment->amount
            && strtoupper((string) ($payload['currency'] ?? '')) === $payment->currency;
    }

    private function authorizeOwner(Request $request, Payment $payment): void
    {
        abort_unless($request->user()->id === $payment->user_id || $request->user()->role === 'admin', 403);
    }
}
