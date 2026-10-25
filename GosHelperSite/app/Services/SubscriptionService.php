<?php

namespace App\Services;

use App\Models\Payment;
use App\Models\Subscription;
use Illuminate\Support\Facades\DB;

class SubscriptionService
{
    public function __construct(private readonly LicenseService $licenses) {}

    public function activate(Payment $payment): array
    {
        return DB::transaction(function () use ($payment): array {
            $payment = Payment::query()->lockForUpdate()->findOrFail($payment->id);
            if ($payment->status === 'succeeded' && $payment->subscription_id) {
                return [$payment->subscription, null];
            }
            if (in_array($payment->status, ['refunded', 'expired'], true)) {
                return [$payment->subscription, null];
            }

            $now = now();
            $current = Subscription::query()
                ->where('user_id', $payment->user_id)
                ->whereIn('status', ['trialing', 'active'])
                ->lockForUpdate()->latest()->first();

            if ($current && $current->plan_id === $payment->plan_id && $current->ends_at?->isFuture()) {
                $subscription = $current;
                $subscription->update([
                    'status' => 'active',
                    'provider' => $payment->provider,
                    'renews_at' => null,
                    'ends_at' => $subscription->ends_at->copy()->addMonthNoOverflow(),
                    'cancel_at_period_end' => false,
                ]);
            } else {
                if ($current) $current->update(['status' => 'canceled', 'ends_at' => $now]);
                $subscription = Subscription::create([
                    'user_id' => $payment->user_id,
                    'plan_id' => $payment->plan_id,
                    'provider' => $payment->provider,
                    'provider_subscription_id' => $payment->order_id,
                    'status' => 'active',
                    'starts_at' => $now,
                    'ends_at' => $now->copy()->addMonthNoOverflow(),
                ]);
            }

            $license = $payment->user->licenses()->where('status', 'active')->lockForUpdate()->latest()->first();
            $rawKey = null;
            if ($license) {
                $license->update([
                    'subscription_id' => $subscription->id,
                    'max_devices' => $payment->plan->device_limit,
                    'expires_at' => $subscription->ends_at,
                ]);
            } else {
                [$license, $rawKey] = $this->licenses->issue($payment->user, $subscription->id, $payment->plan->device_limit);
                $license->update(['expires_at' => $subscription->ends_at]);
            }

            $payment->update([
                'status' => 'succeeded',
                'subscription_id' => $subscription->id,
                'paid_at' => $payment->paid_at ?? $now,
            ]);

            return [$subscription->fresh(), $rawKey];
        }, 3);
    }

    public function refund(Payment $payment): void
    {
        DB::transaction(function () use ($payment): void {
            $payment = Payment::query()->lockForUpdate()->findOrFail($payment->id);
            if ($payment->status === 'refunded') return;
            $payment->update(['status' => 'refunded']);
            $payment->subscription?->update(['status' => 'refunded', 'ends_at' => now()]);
            $payment->subscription?->license?->update(['status' => 'revoked', 'expires_at' => now()]);
        });
    }
}
