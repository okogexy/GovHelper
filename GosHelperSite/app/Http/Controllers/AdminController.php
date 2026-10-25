<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\License;
use App\Models\Payment;
use App\Models\PaymentSetting;
use App\Models\Plan;
use App\Models\Release;
use App\Models\SiteSetting;
use App\Models\Subscription;
use App\Models\User;
use App\Services\EnotPaymentService;
use App\Services\LicenseService;
use App\Services\SubscriptionService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\View\View;

class AdminController extends Controller
{
    private const SECTIONS = ['overview', 'site', 'users', 'plans', 'subscriptions', 'payments', 'licenses', 'releases', 'audit-log', 'system'];

    public function __construct(
        private readonly EnotPaymentService $enot,
        private readonly SubscriptionService $subscriptionService,
        private readonly LicenseService $licenseService,
    ) {}

    public function index(Request $request, string $section = 'overview'): View
    {
        abort_unless(in_array($section, self::SECTIONS, true), 404);
        $data = ['section' => $section, 'paymentSettings' => PaymentSetting::enot(), 'siteSettings' => SiteSetting::values()];

        if ($section === 'overview') {
            $data += [
                'counts' => ['users' => User::count(), 'active' => Subscription::where('status', 'active')->count(), 'payments' => Payment::count(), 'licenses' => License::where('status', 'active')->count()],
                'revenue' => Payment::where('status', 'succeeded')->sum('amount'),
                'recentPayments' => Payment::with(['user', 'plan'])->latest()->limit(8)->get(),
                'metrics' => $this->metrics(),
            ];
        } elseif ($section === 'users') {
            $data['items'] = User::query()->when($request->q, fn ($q, $term) => $q->where(fn ($q) => $q->where('name', 'like', "%$term%")->orWhere('email', 'like', "%$term%")))->latest()->paginate(25)->withQueryString();
        } elseif ($section === 'plans') {
            $data['items'] = Plan::orderBy('sort_order')->get();
        } elseif ($section === 'subscriptions') {
            $data['items'] = Subscription::with(['user', 'plan'])->latest()->paginate(25);
            $data['users'] = User::orderBy('email')->get(['id', 'email']);
            $data['plans'] = Plan::orderBy('sort_order')->get();
        } elseif ($section === 'payments') {
            $data['items'] = Payment::with(['user', 'plan'])->when($request->status, fn ($q, $status) => $q->where('status', $status))->latest()->paginate(25)->withQueryString();
        } elseif ($section === 'licenses') {
            $data['items'] = License::with(['user', 'subscription.plan'])->latest()->paginate(25);
        } elseif ($section === 'releases') {
            $data['items'] = Release::latest()->get();
        } elseif ($section === 'audit-log') {
            $data['items'] = AuditLog::with('actor')->latest('id')->paginate(30);
        } elseif ($section === 'system') {
            $data['system'] = [
                'php' => PHP_VERSION, 'laravel' => app()->version(), 'environment' => app()->environment(),
                'database' => DB::connection()->getDatabaseName(), 'cache' => config('cache.default'),
                'disk_free' => disk_free_space(base_path()), 'memory' => memory_get_usage(true), 'queue' => config('queue.default'),
            ];
            $data['metrics'] = $this->metrics();
        }

        return view('admin.panel', $data);
    }

    public function updateSite(Request $request): RedirectResponse
    {
        $this->assertSuperAdmin($request);
        $validated = $request->validate([
            'brand_name' => 'required|string|max:40', 'product_name' => 'required|string|max:60', 'site_title' => 'required|string|max:100',
            'site_description' => 'nullable|string|max:300', 'tagline' => 'nullable|string|max:180', 'nav_context' => 'nullable|string|max:120',
            'server_count' => 'required|integer|min:0|max:999', 'pricing_title' => 'required|string|max:100', 'pricing_subtitle' => 'nullable|string|max:240',
            'support_email' => 'nullable|email|max:190', 'announcement' => 'nullable|string|max:240', 'footer_text' => 'nullable|string|max:160',
        ]);
        $validated['maintenance_mode'] = $request->boolean('maintenance_mode') ? '1' : '0';
        SiteSetting::putMany($validated, $request->user()->id);
        $this->audit($request, 'site.updated', 'site');
        return back()->with('status', 'Настройки сайта сохранены.');
    }

    public function updatePayments(Request $request): RedirectResponse
    {
        $this->assertSuperAdmin($request);
        $settings = PaymentSetting::enot();
        $validated = $request->validate([
            'mode' => ['required', Rule::in(['test', 'live'])], 'shop_id' => 'nullable|uuid',
            'secret_key' => 'nullable|string|max:500', 'webhook_secret' => 'nullable|string|max:500',
            'invoice_expire' => 'required|integer|min:5|max:7200',
        ]);
        $enabled = $request->boolean('is_enabled');
        if ($enabled && $validated['mode'] === 'live' && (! filled($validated['shop_id']) || (! filled($validated['secret_key']) && ! filled($settings->secret_key)) || (! filled($validated['webhook_secret']) && ! filled($settings->webhook_secret)))) {
            return back()->withErrors(['payment' => 'Для боевого режима заполните Shop ID и оба секретных ключа.']);
        }
        $settings->fill(['mode' => $validated['mode'], 'is_enabled' => $enabled, 'shop_id' => $validated['shop_id'], 'invoice_expire' => $validated['invoice_expire'], 'updated_by' => $request->user()->id]);
        if (filled($validated['secret_key'])) $settings->secret_key = $validated['secret_key'];
        if (filled($validated['webhook_secret'])) $settings->webhook_secret = $validated['webhook_secret'];
        $settings->save();
        $this->audit($request, 'payments.settings.updated', 'enot', ['mode' => $settings->mode, 'enabled' => $settings->is_enabled]);
        return back()->with('status', 'Платёжные настройки сохранены.');
    }

    public function updateUser(Request $request, User $user): RedirectResponse
    {
        $this->assertSuperAdmin($request);
        $validated = $request->validate(['name' => 'required|string|max:100', 'email' => ['required', 'email', Rule::unique('users')->ignore($user)], 'role' => ['required', Rule::in(['user', 'support', 'admin'])]]);
        $blocked = $request->boolean('is_blocked');
        if ($request->user()->is($user) && ($blocked || $validated['role'] !== 'admin')) return back()->withErrors(['user' => 'Нельзя заблокировать или понизить собственную учётную запись.']);
        $user->forceFill($validated + ['is_blocked' => $blocked, 'email_verified_at' => $request->boolean('email_verified') ? ($user->email_verified_at ?? now()) : null])->save();
        $this->audit($request, 'user.updated', $user->public_id, ['role' => $user->role, 'blocked' => $blocked]);
        return back()->with('status', 'Пользователь обновлён.');
    }

    public function savePlan(Request $request, ?Plan $plan = null): RedirectResponse
    {
        $this->assertSuperAdmin($request);
        $plan ??= new Plan;
        $validated = $request->validate([
            'slug' => ['required', 'alpha_dash', 'max:50', Rule::unique('plans')->ignore($plan)], 'name' => 'required|string|max:80', 'description' => 'nullable|string|max:500',
            'price_monthly' => 'required|numeric|min:0|max:1000000', 'price_yearly' => 'nullable|numeric|min:0|max:10000000', 'currency' => 'required|string|size:3',
            'trial_days' => 'required|integer|min:0|max:365', 'device_limit' => 'required|integer|min:1|max:100', 'sort_order' => 'required|integer|min:0|max:999', 'features' => 'nullable|string|max:4000',
        ]);
        $validated['price_monthly'] = (int) round(((float) $validated['price_monthly']) * 100);
        $validated['price_yearly'] = (int) round(((float) ($validated['price_yearly'] ?? 0)) * 100);
        $validated['currency'] = strtoupper($validated['currency']);
        $validated['features'] = collect(preg_split('/\R/u', $validated['features'] ?? ''))->map(fn ($v) => trim($v))->filter()->values()->all();
        $validated['is_active'] = $request->boolean('is_active');
        $plan->fill($validated)->save();
        $this->audit($request, 'plan.saved', $plan->slug, ['active' => $plan->is_active]);
        return back()->with('status', 'Тариф сохранён.');
    }

    public function createSubscription(Request $request): RedirectResponse
    {
        $this->assertSuperAdmin($request);
        $validated = $request->validate(['user_id' => 'required|exists:users,id', 'plan_id' => 'required|exists:plans,id', 'months' => 'required|integer|min:1|max:36']);
        Subscription::where('user_id', $validated['user_id'])->whereIn('status', ['active', 'trialing'])->update(['status' => 'canceled', 'ends_at' => now()]);
        $subscription = Subscription::create(['user_id' => $validated['user_id'], 'plan_id' => $validated['plan_id'], 'provider' => 'admin', 'status' => 'active', 'starts_at' => now(), 'ends_at' => now()->addMonthsNoOverflow($validated['months'])]);
        $user = User::findOrFail($validated['user_id']);
        $license = $user->licenses()->where('status', 'active')->latest()->first();
        $rawKey = null;
        if ($license) {
            $license->update(['subscription_id' => $subscription->id, 'max_devices' => $subscription->plan->device_limit, 'expires_at' => $subscription->ends_at]);
        } else {
            [, $rawKey] = $this->licenseService->issue($user, $subscription->id, $subscription->plan->device_limit);
        }
        $this->audit($request, 'subscription.created', (string) $subscription->id, $validated);
        return back()->with('status', 'Подписка выдана.')->with('license_key', $rawKey);
    }

    public function cancelSubscription(Request $request, Subscription $subscription): RedirectResponse
    {
        $this->assertSuperAdmin($request);
        $subscription->update(['status' => 'canceled', 'ends_at' => now()]);
        $subscription->license?->update(['status' => 'revoked', 'expires_at' => now()]);
        $this->audit($request, 'subscription.canceled', (string) $subscription->id);
        return back()->with('status', 'Подписка отменена.');
    }

    public function syncPayment(Request $request, Payment $payment): RedirectResponse
    {
        $this->assertSuperAdmin($request);
        if ($payment->mode !== 'live' || ! $payment->provider_invoice_id) return back()->withErrors(['payment' => 'Этот платёж нельзя синхронизировать.']);
        try {
            $data = $this->enot->invoiceInfo($payment, PaymentSetting::enot());
            if (($data['status'] ?? null) === 'success') $this->subscriptionService->activate($payment);
            elseif (in_array($data['status'] ?? null, ['fail', 'expired'], true) && $payment->status === 'pending') $payment->update(['status' => $data['status'] === 'fail' ? 'failed' : 'expired']);
            $payment->update(['provider_payload' => $data]);
        } catch (\Throwable $error) { report($error); return back()->withErrors(['payment' => 'ENOT не ответил.']); }
        $this->audit($request, 'payment.synced', $payment->public_id, ['status' => $payment->fresh()->status]);
        return back()->with('status', 'Платёж синхронизирован.');
    }

    public function revokeLicense(Request $request, License $license): RedirectResponse
    {
        $this->assertSuperAdmin($request);
        $license->update(['status' => 'revoked', 'expires_at' => now()]);
        $this->audit($request, 'license.revoked', $license->public_id);
        return back()->with('status', 'Лицензия отозвана.');
    }

    public function updateRelease(Request $request, Release $release): RedirectResponse
    {
        $this->assertSuperAdmin($request);
        $validated = $request->validate(['version' => 'required|string|max:30', 'channel' => ['required', Rule::in(['stable', 'beta'])], 'release_notes' => 'nullable|string|max:3000']);
        if ($request->boolean('is_active')) Release::where('platform', $release->platform)->where('channel', $validated['channel'])->update(['is_active' => false]);
        $release->update($validated + ['is_active' => $request->boolean('is_active'), 'published_at' => $request->boolean('is_active') ? ($release->published_at ?? now()) : $release->published_at]);
        $this->audit($request, 'release.updated', $release->public_id);
        return back()->with('status', 'Релиз обновлён.');
    }

    private function metrics(): array
    {
        $rows = [];
        for ($i = 59; $i >= 0; $i--) {
            $at = now()->subMinutes($i); $key = $at->format('YmdHi'); $requests = (int) Cache::get("metrics:$key:requests", 0);
            $rows[] = ['time' => $at->format('H:i'), 'requests' => $requests, 'errors' => (int) Cache::get("metrics:$key:errors", 0), 'avg_ms' => $requests ? (int) round(Cache::get("metrics:$key:milliseconds", 0) / $requests) : 0];
        }
        return $rows;
    }

    private function audit(Request $request, string $action, ?string $target = null, array $metadata = []): void
    {
        AuditLog::create(['actor_id' => $request->user()->id, 'action' => $action, 'target_type' => Str::before($action, '.'), 'target_public_id' => Str::isUuid($target) ? $target : null, 'metadata' => $metadata + ($target && ! Str::isUuid($target) ? ['target' => $target] : []), 'ip_hash' => hash_hmac('sha256', (string) $request->ip(), (string) config('app.key')), 'created_at' => now()]);
    }

    private function assertSuperAdmin(Request $request): void
    {
        abort_unless($request->user()?->role === 'admin', 403);
    }
}
