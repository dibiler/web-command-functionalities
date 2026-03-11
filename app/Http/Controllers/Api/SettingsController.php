<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\UserSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SettingsController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $settings = $request->user()?->setting;

        return response()->json([
            'settings' => $this->serializeSettings($settings),
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'themeBackgroundColor' => ['required', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'themeFontColor' => ['required', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'fontFamily' => ['required', 'string', 'max:255'],
            'fontSize' => ['required', 'integer', 'min:12', 'max:24'],
            'lineHeight' => ['required', 'numeric', 'min:1', 'max:2'],
        ]);

        $setting = UserSetting::query()->updateOrCreate(
            ['user_id' => $request->user()->id],
            [
                'theme_background_color' => $validated['themeBackgroundColor'],
                'theme_font_color' => $validated['themeFontColor'],
                'font_family' => $validated['fontFamily'],
                'font_size' => $validated['fontSize'],
                'line_height' => $validated['lineHeight'],
            ],
        );

        return response()->json([
            'message' => 'Settings saved successfully.',
            'settings' => $this->serializeSettings($setting),
        ]);
    }

    private function serializeSettings(?UserSetting $settings): array
    {
        return [
            'themeBackgroundColor' => $settings?->theme_background_color ?? '#09090b',
            'themeFontColor' => $settings?->theme_font_color ?? '#f4f4f5',
            'fontFamily' => $settings?->font_family ?? 'Fira Code, Consolas, monospace',
            'fontSize' => $settings?->font_size ?? 14,
            'lineHeight' => $settings?->line_height !== null ? (float) $settings->line_height : 1.5,
        ];
    }
}
