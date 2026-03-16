<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class CurriculumController extends Controller
{
    public function update(Request $request)
    {
        $user = Auth::user();

        $fields = $request->validate([
            'bio'              => 'nullable|string|max:1000',
            'city'             => 'nullable|string|max:100',
            'country'          => 'nullable|string|max:100',
            'website'          => 'nullable|url|max:255',
            'phone'            => 'nullable|string|max:20',
            'birth_date'       => 'nullable|date',
            'years_experience' => 'nullable|integer|min:0|max:60',
            'contract_type'    => 'nullable|string|max:100',
            'available'        => 'nullable|boolean',
            'curriculum_public' => 'nullable|boolean',
            'skills'           => 'nullable|array',
            'skills.*'         => 'string|max:50',
            'languages'        => 'nullable|array',
            'languages.*'      => 'string|max:50',
        ]);

        $user->update($fields);

        return response()->json(['user' => $user]);
    }
}