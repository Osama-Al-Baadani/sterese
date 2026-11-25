<?php

namespace App\Http\Controllers\Api\Concerns;

use App\Models\CustomerAuthToken;
use Illuminate\Http\Request;

/**
 * Every wallet/profile/address/order-history endpoint used to trust
 * whatever customer_id or phone the caller put in the URL/body, with
 * nothing to verify they actually own it — any id could be substituted
 * to read or mutate another customer's data. These helpers resolve the
 * bearer token issued at login/registration and require it to match.
 */
trait AuthorizesCustomer
{
    protected function authorizeCustomer(Request $request, int $expectedCustomerId): void
    {
        $resolvedId = CustomerAuthToken::resolve($request->bearerToken());

        if ($resolvedId === null) {
            abort(response()->json(['message' => 'يجب تسجيل الدخول'], 401));
        }
        if ($resolvedId !== $expectedCustomerId) {
            abort(response()->json(['message' => 'غير مصرح لك بهذا الإجراء'], 403));
        }
    }

    /** Same idea, keyed by phone — used for the addresses table (no customer_id column). */
    protected function authorizeCustomerPhone(Request $request, ?string $phone): void
    {
        $token = $request->bearerToken();
        $row = $token ? CustomerAuthToken::where('token', $token)->first() : null;

        if (!$row) {
            abort(response()->json(['message' => 'يجب تسجيل الدخول'], 401));
        }
        $row->update(['last_used_at' => now()]);

        $normalize = fn ($p) => preg_replace('/\D/', '', (string) $p);
        $normalizedPhone = $normalize($phone);
        if ($normalizedPhone === '' || $normalize($row->phone) !== $normalizedPhone) {
            abort(response()->json(['message' => 'غير مصرح لك بهذا الإجراء'], 403));
        }
    }

    /**
     * Lenient version for endpoints where blocking outright would break app
     * versions older than the auth-token rollout (they can never send one).
     * A present-and-matching token still passes; a present-and-mismatched
     * token is still blocked (that's a real problem, not a legacy client).
     * Only a completely absent token falls back to trusting the claimed id —
     * exactly the old behavior, kept only for clients with no way to prove
     * otherwise. No money moves through these endpoints, so the residual
     * risk is data exposure/tampering, not theft.
     */
    protected function authorizeCustomerLenient(Request $request, int $claimedCustomerId): void
    {
        $token = $request->bearerToken();
        if (!$token) return;

        $resolvedId = CustomerAuthToken::resolve($token);
        if ($resolvedId !== null && $resolvedId !== $claimedCustomerId) {
            abort(response()->json(['message' => 'غير مصرح لك بهذا الإجراء'], 403));
        }
    }

    /** Phone-keyed counterpart of authorizeCustomerLenient, for the addresses table. */
    protected function authorizeCustomerPhoneLenient(Request $request, ?string $claimedPhone): void
    {
        $token = $request->bearerToken();
        if (!$token) return;

        $row = CustomerAuthToken::where('token', $token)->first();
        if (!$row) {
            abort(response()->json(['message' => 'يجب تسجيل الدخول'], 401));
        }
        $row->update(['last_used_at' => now()]);

        $normalize = fn ($p) => preg_replace('/\D/', '', (string) $p);
        if ($normalize($row->phone) !== $normalize($claimedPhone)) {
            abort(response()->json(['message' => 'غير مصرح لك بهذا الإجراء'], 403));
        }
    }

    /**
     * Resolves a customer_id ONLY when the caller's own token proves it —
     * used wherever an unverified claim must never grant money (wallet
     * discount, account linkage). No token, no match, no proof → null,
     * and the caller proceeds as a guest instead of being blocked, so
     * checkout itself never fails over this.
     */
    protected function verifiedCustomerId(Request $request, $claimedCustomerId): ?int
    {
        if (!$claimedCustomerId) return null;
        $resolvedId = CustomerAuthToken::resolve($request->bearerToken());
        return ($resolvedId !== null && $resolvedId === (int) $claimedCustomerId) ? $resolvedId : null;
    }
}
