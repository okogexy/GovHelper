<?php
namespace App\Http\Controllers;
use App\Models\DownloadLog;
use App\Models\Release;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
class DownloadController extends Controller { public function __invoke(Request $request,Release $release){$subscription=$request->user()->activeSubscription();$license=$request->user()->licenses()->where('status','active')->first();abort_unless($subscription?->isEntitled()&&$license?->isValid(),403);abort_unless($release->is_active&&$release->platform==='windows'&&$release->storage_disk==='local',404);abort_if(str_contains($release->storage_path,'..'),400);abort_unless(Storage::disk('local')->exists($release->storage_path),404);DownloadLog::create(['user_id'=>$request->user()->id,'release_id'=>$release->id,'ip_hash'=>hash_hmac('sha256',(string)$request->ip(),config('app.key')),'user_agent'=>mb_substr((string)$request->userAgent(),0,500),'downloaded_at'=>now()]);return Storage::disk('local')->download($release->storage_path,$release->filename,['Content-Type'=>'application/octet-stream','X-Content-Type-Options'=>'nosniff']);} }
