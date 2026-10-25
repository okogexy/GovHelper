<?php

namespace Tests\Feature;

use App\Models\Payment;
use App\Models\PaymentSetting;
use App\Models\Plan;
use App\Models\User;
use App\Services\EnotPaymentService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\URL;
use Tests\TestCase;

class CheckoutTest extends TestCase
{
    use RefreshDatabase;

    private function user(): User { return User::factory()->create(['email_verified_at' => now()]); }
    private function plan(): Plan { return Plan::create(['slug'=>'plus','name'=>'GOVHelper Plus','price_monthly'=>29900,'price_yearly'=>299000,'currency'=>'RUB','trial_days'=>0,'device_limit'=>2,'features'=>['AI'],'is_active'=>true,'sort_order'=>1]); }
    private function checkoutUrl(Plan $plan): string { return URL::temporarySignedRoute('checkout.store', now()->addMinutes(15), ['plan' => $plan]); }

    public function test_test_mode_grants_subscription_without_external_payment(): void
    {
        $user = $this->user(); $plan = $this->plan();
        PaymentSetting::create(['provider'=>'enot','mode'=>'test','is_enabled'=>true,'invoice_expire'=>60]);

        $response = $this->actingAs($user)->post($this->checkoutUrl($plan));
        $payment = Payment::firstOrFail();

        $response->assertRedirect(route('checkout.success', $payment));
        $this->assertDatabaseHas('payments', ['id'=>$payment->id,'status'=>'succeeded','mode'=>'test']);
        $this->assertDatabaseHas('subscriptions', ['user_id'=>$user->id,'plan_id'=>$plan->id,'status'=>'active']);
        $this->assertDatabaseHas('licenses', ['user_id'=>$user->id,'status'=>'active','max_devices'=>2]);
    }

    public function test_live_mode_creates_enot_invoice_and_redirects_to_payment(): void
    {
        $user = $this->user(); $plan = $this->plan();
        PaymentSetting::create(['provider'=>'enot','mode'=>'live','is_enabled'=>true,'shop_id'=>'17cdb155-8b25-4bf5-b198-104c1ab8f0b7','secret_key'=>'api-secret','webhook_secret'=>'hook-secret','invoice_expire'=>30]);
        Http::fake(['api.enot.io/invoice/create' => Http::response(['data'=>['id'=>'a13fb252-6e8c-4bdf-805a-b997e96ba2aa','url'=>'https://enot.io/pay/example','expired'=>now()->addMinutes(30)->toIso8601String()]])]);

        $this->actingAs($user)->post($this->checkoutUrl($plan))->assertRedirect('https://enot.io/pay/example');
        $this->assertDatabaseHas('payments', ['status'=>'pending','mode'=>'live','provider_invoice_id'=>'a13fb252-6e8c-4bdf-805a-b997e96ba2aa']);
        Http::assertSent(fn ($request) => $request->hasHeader('x-api-key','api-secret') && $request['amount'] === 299 && $request['currency'] === 'RUB');
    }

    public function test_checkout_rejects_unsigned_or_tampered_request(): void
    {
        $user = $this->user(); $plan = $this->plan();
        PaymentSetting::create(['provider'=>'enot','mode'=>'test','is_enabled'=>true,'invoice_expire'=>60]);

        $this->actingAs($user)->post(route('checkout.store', $plan))->assertForbidden();
        $this->assertSame(0, Payment::count());
    }

    public function test_signed_success_webhook_is_idempotent_and_invalid_signature_is_rejected(): void
    {
        $user = $this->user(); $plan = $this->plan();
        $settings = PaymentSetting::create(['provider'=>'enot','mode'=>'live','is_enabled'=>true,'shop_id'=>'17cdb155-8b25-4bf5-b198-104c1ab8f0b7','secret_key'=>'api-secret','webhook_secret'=>'hook-secret','invoice_expire'=>30]);
        $payment = Payment::create(['user_id'=>$user->id,'plan_id'=>$plan->id,'provider'=>'enot','mode'=>'live','provider_invoice_id'=>'a13fb252-6e8c-4bdf-805a-b997e96ba2aa','status'=>'pending','amount'=>29900,'currency'=>'RUB']);
        $payload = ['status'=>'success','invoice_id'=>$payment->provider_invoice_id,'order_id'=>$payment->order_id,'amount'=>299,'currency'=>'RUB','code'=>1,'type'=>1];
        $signature = app(EnotPaymentService::class)->signature($payload, 'hook-secret');

        $this->postJson(route('webhooks.enot'), $payload, ['x-api-sha256-signature'=>'wrong'])->assertUnauthorized();
        $this->postJson(route('webhooks.enot'), $payload, ['x-api-sha256-signature'=>$signature])->assertOk();
        $this->postJson(route('webhooks.enot'), $payload, ['x-api-sha256-signature'=>$signature])->assertOk();
        $this->assertSame(1, $user->subscriptions()->count());
        $this->assertSame('succeeded', $payment->fresh()->status);
    }

    public function test_refund_cannot_be_reactivated_by_replayed_success_webhook(): void
    {
        $user = $this->user(); $plan = $this->plan();
        PaymentSetting::create(['provider'=>'enot','mode'=>'live','is_enabled'=>false,'shop_id'=>'17cdb155-8b25-4bf5-b198-104c1ab8f0b7','secret_key'=>'api-secret','webhook_secret'=>'hook-secret','invoice_expire'=>30]);
        $payment = Payment::create(['user_id'=>$user->id,'plan_id'=>$plan->id,'provider'=>'enot','mode'=>'live','provider_invoice_id'=>'a13fb252-6e8c-4bdf-805a-b997e96ba2aa','status'=>'pending','amount'=>29900,'currency'=>'RUB']);
        $service = app(EnotPaymentService::class);
        $success = ['status'=>'success','invoice_id'=>$payment->provider_invoice_id,'order_id'=>$payment->order_id,'amount'=>299,'currency'=>'RUB','code'=>1,'type'=>1];
        $this->postJson(route('webhooks.enot'), $success, ['x-api-sha256-signature'=>$service->signature($success,'hook-secret')])->assertOk();
        $refund = [...$success, 'status'=>'refund', 'code'=>20, 'type'=>2];
        $this->postJson(route('webhooks.enot'), $refund, ['x-api-sha256-signature'=>$service->signature($refund,'hook-secret')])->assertOk();
        $this->postJson(route('webhooks.enot'), $success, ['x-api-sha256-signature'=>$service->signature($success,'hook-secret')])->assertOk();

        $payment = $payment->fresh();
        $this->assertSame('refunded', $payment->status);
        $this->assertSame('refunded', $payment->subscription->fresh()->status);
        $this->assertSame('revoked', $payment->subscription->license->fresh()->status);
    }
}
