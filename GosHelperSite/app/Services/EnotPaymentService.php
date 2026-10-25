<?php

namespace App\Services;

use App\Models\Payment;
use App\Models\PaymentSetting;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class EnotPaymentService
{
    private const API = 'https://api.enot.io';

    private function client(PaymentSetting $settings): PendingRequest
    {
        return Http::acceptJson()
            ->asJson()
            ->withHeader('x-api-key', (string) $settings->secret_key)
            ->connectTimeout(8)
            ->timeout(20)
            ->retry(2, 250, throw: false);
    }

    public function createInvoice(Payment $payment, PaymentSetting $settings): Payment
    {
        if (! $settings->isReadyForLive()) {
            throw ValidationException::withMessages(['payment' => 'Боевой режим ENOT не настроен.']);
        }

        $response = $this->client($settings)->post(self::API.'/invoice/create', [
            'amount' => $payment->amount / 100,
            'order_id' => $payment->order_id,
            'currency' => $payment->currency,
            'shop_id' => $settings->shop_id,
            'hook_url' => route('webhooks.enot'),
            'success_url' => route('checkout.success', $payment),
            'fail_url' => route('checkout.fail', $payment),
            'expire' => $settings->invoice_expire,
            'comment' => "GOVHelper {$payment->plan->name}",
            'custom_fields' => json_encode(['payment' => $payment->public_id], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
        ]);

        $response->throw();
        $data = $response->json('data');
        $url = data_get($data, 'url');
        $invoiceId = data_get($data, 'id');

        $host = is_string($url) ? strtolower((string) parse_url($url, PHP_URL_HOST)) : '';
        $trustedHost = $host === 'enot.io' || str_ends_with($host, '.enot.io');
        if (! is_string($url) || ! str_starts_with($url, 'https://') || ! $trustedHost || ! is_string($invoiceId) || ! Str::isUuid($invoiceId)) {
            throw ValidationException::withMessages(['payment' => 'ENOT вернул некорректный счёт.']);
        }

        $payment->update([
            'provider_invoice_id' => $invoiceId,
            'payment_url' => $url,
            'provider_payload' => $data,
            'expires_at' => data_get($data, 'expired'),
        ]);

        return $payment->refresh();
    }

    public function invoiceInfo(Payment $payment, PaymentSetting $settings): array
    {
        $response = $this->client($settings)->get(self::API.'/invoice/info', [
            'invoice_id' => $payment->provider_invoice_id,
            'shop_id' => $settings->shop_id,
        ]);
        $response->throw();

        return (array) $response->json('data', []);
    }

    public function signature(array $payload, string $secret): string
    {
        ksort($payload, SORT_STRING);
        $json = json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

        return hash_hmac('sha256', $json === false ? '' : $json, $secret);
    }

    public function validWebhookSignature(array $payload, ?string $signature, PaymentSetting $settings): bool
    {
        return filled($signature) && filled($settings->webhook_secret)
            && hash_equals($this->signature($payload, (string) $settings->webhook_secret), (string) $signature);
    }
}
