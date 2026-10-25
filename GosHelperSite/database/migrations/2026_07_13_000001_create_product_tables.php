<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('plans', function (Blueprint $table) {
            $table->id(); $table->string('slug')->unique(); $table->string('name'); $table->text('description')->nullable();
            $table->unsignedInteger('price_monthly'); $table->unsignedInteger('price_yearly'); $table->string('currency', 3)->default('RUB');
            $table->unsignedSmallInteger('trial_days')->default(0); $table->unsignedSmallInteger('device_limit')->default(1); $table->json('features');
            $table->boolean('is_active')->default(true); $table->unsignedSmallInteger('sort_order')->default(0); $table->timestamps();
        });
        Schema::create('subscriptions', function (Blueprint $table) {
            $table->id(); $table->foreignId('user_id')->constrained()->cascadeOnDelete(); $table->foreignId('plan_id')->constrained();
            $table->string('provider')->nullable(); $table->string('provider_customer_id')->nullable()->index(); $table->string('provider_subscription_id')->nullable()->unique();
            $table->string('status')->index(); $table->timestamp('starts_at'); $table->timestamp('trial_ends_at')->nullable(); $table->timestamp('renews_at')->nullable(); $table->timestamp('ends_at')->nullable(); $table->boolean('cancel_at_period_end')->default(false); $table->timestamps();
        });
        Schema::create('licenses', function (Blueprint $table) {
            $table->id(); $table->uuid('public_id')->unique(); $table->foreignId('user_id')->constrained()->cascadeOnDelete(); $table->foreignId('subscription_id')->nullable()->constrained()->nullOnDelete();
            $table->string('key_prefix', 16); $table->string('key_hash', 64)->unique(); $table->string('status')->default('active')->index(); $table->unsignedSmallInteger('max_devices')->default(1); $table->timestamp('expires_at')->nullable(); $table->timestamp('last_used_at')->nullable(); $table->timestamps();
        });
        Schema::create('device_activations', function (Blueprint $table) {
            $table->id(); $table->uuid('public_id')->unique(); $table->foreignId('license_id')->constrained()->cascadeOnDelete(); $table->string('device_hash', 64); $table->string('device_name', 100); $table->string('platform', 30); $table->string('app_version', 30)->nullable(); $table->string('last_ip', 45)->nullable(); $table->timestamp('activated_at'); $table->timestamp('last_seen_at')->nullable(); $table->timestamp('revoked_at')->nullable(); $table->timestamps(); $table->unique(['license_id', 'device_hash']);
        });
        Schema::create('releases', function (Blueprint $table) {
            $table->id(); $table->uuid('public_id')->unique(); $table->string('version'); $table->string('channel')->default('stable'); $table->string('platform')->default('windows'); $table->string('filename'); $table->string('storage_disk')->default('local'); $table->string('storage_path'); $table->unsignedBigInteger('size_bytes'); $table->string('sha256', 64); $table->text('release_notes')->nullable(); $table->timestamp('published_at')->nullable(); $table->boolean('is_active')->default(false); $table->timestamps();
        });
        Schema::create('download_logs', function (Blueprint $table) { $table->id(); $table->foreignId('user_id')->constrained()->cascadeOnDelete(); $table->foreignId('release_id')->constrained()->cascadeOnDelete(); $table->string('ip_hash', 64); $table->string('user_agent', 500)->nullable(); $table->timestamp('downloaded_at'); });
        Schema::create('audit_logs', function (Blueprint $table) { $table->id(); $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete(); $table->string('action')->index(); $table->string('target_type')->nullable(); $table->uuid('target_public_id')->nullable(); $table->json('metadata')->nullable(); $table->string('ip_hash', 64)->nullable(); $table->timestamp('created_at'); });
    }
    public function down(): void { Schema::dropIfExists('audit_logs'); Schema::dropIfExists('download_logs'); Schema::dropIfExists('releases'); Schema::dropIfExists('device_activations'); Schema::dropIfExists('licenses'); Schema::dropIfExists('subscriptions'); Schema::dropIfExists('plans'); }
};
