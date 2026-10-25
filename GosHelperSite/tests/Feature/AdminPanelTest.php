<?php

namespace Tests\Feature;

use App\Models\PaymentSetting;
use App\Models\Payment;
use App\Models\Plan;
use App\Models\SiteSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class AdminPanelTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_open_every_control_room_section(): void
    {
        $admin = User::factory()->create(['role'=>'admin','email_verified_at'=>now()]);
        foreach (['overview','site','users','plans','subscriptions','payments','licenses','releases','audit-log','system'] as $section) {
            $this->actingAs($admin)->get(route('admin',['section'=>$section]))->assertOk();
        }
    }

    public function test_normal_user_cannot_open_admin_panel(): void
    {
        $user = User::factory()->create(['role'=>'user','email_verified_at'=>now()]);
        $this->actingAs($user)->get(route('admin'))->assertForbidden();
    }

    public function test_support_access_is_read_only(): void
    {
        $support = User::factory()->create(['role'=>'support','email_verified_at'=>now()]);
        $target = User::factory()->create(['role'=>'user','email_verified_at'=>now()]);
        $this->actingAs($support)->get(route('admin',['section'=>'users']))->assertOk()->assertSee('Режим просмотра');
        $this->actingAs($support)->put(route('admin.users.update',$target), ['name'=>$target->name,'email'=>$target->email,'role'=>'admin'])->assertForbidden();
        $this->assertSame('user', $target->fresh()->role);
    }

    public function test_admin_updates_site_and_encrypted_payment_settings(): void
    {
        $admin = User::factory()->create(['role'=>'admin','email_verified_at'=>now()]);
        $this->actingAs($admin)->put(route('admin.site.update'), [
            'brand_name'=>'VEYRON','product_name'=>'GOVHelper','site_title'=>'New title','site_description'=>'Description','tagline'=>'Tagline','nav_context'=>'AI · Кодексы','server_count'=>19,'pricing_title'=>'Тарифы','pricing_subtitle'=>'Описание','support_email'=>'support@example.com','announcement'=>'','footer_text'=>'Footer',
        ])->assertRedirect();
        $this->assertSame('New title', SiteSetting::values()['site_title']);

        $this->actingAs($admin)->put(route('admin.payments.update'), ['mode'=>'live','is_enabled'=>'1','shop_id'=>'17cdb155-8b25-4bf5-b198-104c1ab8f0b7','secret_key'=>'api-secret','webhook_secret'=>'hook-secret','invoice_expire'=>60])->assertRedirect();
        $settings = PaymentSetting::enot();
        $this->assertSame('api-secret', $settings->secret_key);
        $this->assertStringNotContainsString('api-secret', (string) DB::table('payment_settings')->value('secret_key'));
        $this->assertDatabaseHas('audit_logs', ['actor_id'=>$admin->id,'action'=>'payments.settings.updated']);
    }

    public function test_populated_payment_and_plan_pages_render(): void
    {
        $admin = User::factory()->create(['role'=>'admin','email_verified_at'=>now()]);
        $plan = Plan::create(['slug'=>'plus','name'=>'GOVHelper Plus','price_monthly'=>29900,'price_yearly'=>299000,'currency'=>'RUB','trial_days'=>0,'device_limit'=>2,'features'=>['AI'],'is_active'=>true,'sort_order'=>1]);
        Payment::create(['user_id'=>$admin->id,'plan_id'=>$plan->id,'provider'=>'enot','mode'=>'test','status'=>'succeeded','amount'=>29900,'currency'=>'RUB','paid_at'=>now()]);
        $this->actingAs($admin)->get(route('admin',['section'=>'payments']))->assertOk()->assertSee('GOVHelper Plus');
        $this->actingAs($admin)->get(route('admin',['section'=>'plans']))->assertOk()->assertSee('Цена / месяц');
        $this->actingAs($admin)->get(route('pricing'))->assertOk()->assertSee('Получить Plus');
    }
}
