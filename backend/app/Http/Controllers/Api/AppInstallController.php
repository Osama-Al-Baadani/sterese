<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AppInstall;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class AppInstallController extends Controller
{
    // Called once on every app launch (fire-and-forget from the client).
    // Upserts by device_id: first call creates the row (first_seen_at = now,
    // this is what "installs today/week/month" counts against); every call
    // after that just refreshes last_seen_at (+ app_version/media_source in
    // case they changed) — this is what "active users" counts against, and
    // is also called again once AppsFlyer's conversion data resolves, since
    // that can arrive after this endpoint's first call in the same session.
    public function track(Request $request): JsonResponse
    {
        $data = $request->validate([
            'device_id'    => 'required|string|max:100',
            'platform'     => 'nullable|string|max:20',
            'app_version'  => 'nullable|string|max:30',
            'media_source' => 'nullable|string|max:100',
            'campaign'     => 'nullable|string|max:150',
        ]);

        $now = now();
        $existing = AppInstall::where('device_id', $data['device_id'])->first();

        if ($existing) {
            $existing->update(array_filter([
                'platform'     => $data['platform']     ?? $existing->platform,
                'app_version'  => $data['app_version']   ?? $existing->app_version,
                'media_source' => $data['media_source']  ?? $existing->media_source,
                'campaign'     => $data['campaign']      ?? $existing->campaign,
                'last_seen_at' => $now,
            ], fn ($v) => $v !== null));
        } else {
            AppInstall::create([
                ...$data,
                'first_seen_at' => $now,
                'last_seen_at'  => $now,
            ]);
        }

        return response()->json(['ok' => true]);
    }
}
