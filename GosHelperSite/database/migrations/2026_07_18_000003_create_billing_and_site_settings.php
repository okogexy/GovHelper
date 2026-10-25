<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('site_settings', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->text('value')->nullable();
            $table->string('group')->default('general')->index();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('payment_settings', function (Blueprint $table) {
            $table->id();
            $table->string('provider')->unique();
            $table->string('mode')->default('test');
            $table->boolean('is_enabled')->default(false);
            $table->uuid('shop_id')->nullable();
            $table->text('secret_key')->nullable();
            $table->text('webhook_secret')->nullable();
            $table->unsignedSmallInteger('invoice_expire')->default(60);
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->uuid('public_id')->unique();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('plan_id')->constrained()->restrictOnDelete();
            $table->foreignId('subscription_id')->nullable()->constrained()->nullOnDelete();
            $table->string('provider')->default('enot')->index();
            $table->string('mode')->default('test');
            $table->uuid('order_id')->unique();
            $table->uuid('provider_invoice_id')->nullable()->unique();
            $table->string('status')->default('pending')->index();
            $table->unsignedBigInteger('amount');
            $table->string('currency', 3)->default('RUB');
            $table->text('payment_url')->nullable();
            $table->json('provider_payload')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();
            $table->index(['user_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
        Schema::dropIfExists('payment_settings');
        Schema::dropIfExists('site_settings');
    }
};
