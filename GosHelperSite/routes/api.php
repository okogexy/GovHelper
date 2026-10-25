<?php

use App\Http\Controllers\Api\LicenseController;
use App\Http\Controllers\Api\ProgramAuthController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1/license')->middleware('throttle:license-api')->group(function () {
    Route::post('/activate', [LicenseController::class, 'activate']);
    Route::post('/validate', [LicenseController::class, 'validateKey']);
    Route::post('/deactivate', [LicenseController::class, 'deactivate']);
});
Route::prefix('v1/program')->middleware('throttle:program-api')->group(function () {
    Route::get('/ping', [ProgramAuthController::class, 'ping']);
    Route::post('/register', [ProgramAuthController::class, 'register'])->middleware('throttle:register');
    Route::post('/login', [ProgramAuthController::class, 'login'])->middleware('throttle:login');
    Route::middleware('program.auth')->group(function () {
        Route::get('/me', [ProgramAuthController::class, 'me']);
        Route::post('/logout', [ProgramAuthController::class, 'logout']);
    });
});
