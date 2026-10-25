<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
    public function up(): void { Schema::create('program_access_tokens', function (Blueprint $table) { $table->id(); $table->foreignId('user_id')->constrained()->cascadeOnDelete(); $table->string('name', 100); $table->string('token_hash', 64)->unique(); $table->timestamp('last_used_at')->nullable(); $table->timestamp('expires_at')->index(); $table->timestamps(); }); }
    public function down(): void { Schema::dropIfExists('program_access_tokens'); }
};
