<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CommandsController;
use App\Http\Controllers\Api\SettingsController;
use App\Http\Controllers\Api\WorkspaceController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/commands', [CommandsController::class, 'index']);

Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/me', [AuthController::class, 'me']);
        Route::post('/logout', [AuthController::class, 'logout']);
    });
});

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/workspace', [WorkspaceController::class, 'index']);
    Route::match(['put', 'post'], '/workspace', [WorkspaceController::class, 'save']);
    Route::get('/settings', [SettingsController::class, 'index']);
    Route::match(['patch', 'put'], '/settings', [SettingsController::class, 'update']);
});

Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});
