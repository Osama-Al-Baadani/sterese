<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\AuthorizesCustomer;
use App\Models\CustomerAddress;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class AddressController extends Controller
{
    use AuthorizesCustomer;

    // GET /api/addresses?phone=05xxxxxxxx
    public function index(Request $request)
    {
        $phone = $request->query('phone');
        if (!$phone) return response()->json(['error' => 'phone required'], 422);
        $this->authorizeCustomerPhoneLenient($request, $phone);

        $addresses = CustomerAddress::where('phone', $phone)
            ->orderByDesc('is_default')
            ->orderBy('created_at')
            ->get();

        return response()->json($addresses);
    }

    // POST /api/addresses
    public function store(Request $request)
    {
        $data = $request->validate([
            'phone'        => 'required|string|max:20',
            'label'        => 'required|in:home,work,friend,other',
            'address_text' => 'required|string',
            'city'         => 'nullable|string',
            'lat'          => 'nullable|numeric',
            'lng'          => 'nullable|numeric',
            'zone'         => 'nullable|string',
            'is_default'   => 'boolean',
        ]);
        $this->authorizeCustomerPhoneLenient($request, $data['phone']);

        // Max 4 addresses per phone
        $count = CustomerAddress::where('phone', $data['phone'])->count();
        if ($count >= 4) {
            return response()->json(['error' => 'max_addresses_reached'], 422);
        }

        // Only one default per phone
        if (!empty($data['is_default'])) {
            CustomerAddress::where('phone', $data['phone'])->update(['is_default' => false]);
        }

        $address = CustomerAddress::create($data);
        return response()->json($address, 201);
    }

    // PUT /api/addresses/{id}
    public function update(Request $request, int $id)
    {
        $address = CustomerAddress::findOrFail($id);
        $this->authorizeCustomerPhoneLenient($request, $address->phone);

        $data = $request->validate([
            'label'        => 'sometimes|in:home,work,friend,other',
            'address_text' => 'sometimes|string',
            'city'         => 'nullable|string',
            'lat'          => 'nullable|numeric',
            'lng'          => 'nullable|numeric',
            'zone'         => 'nullable|string',
            'is_default'   => 'boolean',
        ]);

        if (!empty($data['is_default'])) {
            CustomerAddress::where('phone', $address->phone)->update(['is_default' => false]);
        }

        $address->update($data);
        return response()->json($address);
    }

    // DELETE /api/addresses/{id}
    public function destroy(Request $request, int $id)
    {
        $address = CustomerAddress::findOrFail($id);
        $this->authorizeCustomerPhoneLenient($request, $address->phone);

        $address->delete();
        return response()->json(['ok' => true]);
    }
}
