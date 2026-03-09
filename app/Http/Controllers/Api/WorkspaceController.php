<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CommandEntry;
use App\Models\CommandTab;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class WorkspaceController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $tabs = CommandTab::query()
            ->where('user_id', $user->id)
            ->orderBy('position')
            ->with(['entries' => function ($query) {
                $query->orderBy('executed_at')->orderBy('id');
            }])
            ->get();

        return response()->json([
            'tabs' => $tabs->map(function (CommandTab $tab) {
                return [
                    'id' => $tab->client_id,
                    'name' => $tab->name,
                    'entries' => $tab->entries->map(function (CommandEntry $entry) {
                        return [
                            'id' => $entry->client_id,
                            'command' => $entry->command,
                            'response' => $entry->response,
                            'status' => $entry->status,
                            'timestamp' => $entry->executed_at?->toIso8601String(),
                        ];
                    })->values(),
                ];
            })->values(),
        ]);
    }

    public function save(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'tabs' => ['required', 'array'],
            'tabs.*.id' => ['required', 'string', 'max:120'],
            'tabs.*.name' => ['required', 'string', 'max:255'],
            'tabs.*.entries' => ['required', 'array'],
            'tabs.*.entries.*.id' => ['required', 'string', 'max:120'],
            'tabs.*.entries.*.command' => ['required', 'string'],
            'tabs.*.entries.*.response' => ['required', 'string'],
            'tabs.*.entries.*.status' => ['required', 'string', 'in:success,error,info'],
            'tabs.*.entries.*.timestamp' => ['required', 'string'],
        ]);

        $user = $request->user();

        DB::transaction(function () use ($user, $validated) {
            CommandEntry::query()->where('user_id', $user->id)->delete();
            CommandTab::query()->where('user_id', $user->id)->delete();

            foreach ($validated['tabs'] as $tabIndex => $tabPayload) {
                $tab = CommandTab::query()->create([
                    'user_id' => $user->id,
                    'client_id' => $tabPayload['id'],
                    'name' => $tabPayload['name'],
                    'position' => $tabIndex,
                ]);

                foreach ($tabPayload['entries'] as $entryPayload) {
                    $executedAt = Carbon::parse($entryPayload['timestamp']);

                    CommandEntry::query()->create([
                        'user_id' => $user->id,
                        'command_tab_id' => $tab->id,
                        'client_id' => $entryPayload['id'],
                        'command' => $entryPayload['command'],
                        'response' => $entryPayload['response'],
                        'status' => $entryPayload['status'],
                        'executed_at' => $executedAt,
                    ]);
                }
            }
        });

        return response()->json([
            'message' => 'Workspace saved successfully.',
        ]);
    }
}
