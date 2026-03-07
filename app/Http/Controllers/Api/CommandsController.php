<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;

class CommandsController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'commands' => [],
            'source' => 'frontend',
            'message' => 'Command definitions are managed in the frontend for offline-first execution.',
        ]);
    }
}
