<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $legacy = DB::table('plans')->where('slug', 'pro')->first();
        $plus = DB::table('plans')->where('slug', 'plus')->first();

        if ($legacy && $plus) {
            DB::table('subscriptions')->where('plan_id', $legacy->id)->update(['plan_id' => $plus->id]);
            DB::table('plans')->where('id', $legacy->id)->delete();
        } elseif ($legacy) {
            DB::table('plans')->where('id', $legacy->id)->update(['slug' => 'plus', 'name' => 'GOVHelper Plus']);
        }

        DB::table('plans')->where('slug', 'plus')->update(['name' => 'GOVHelper Plus']);
    }

    public function down(): void
    {
        DB::table('plans')->where('slug', 'plus')->update(['slug' => 'pro', 'name' => 'GOVHelper Pro']);
    }
};
