<?php 

namespace App\Http\Controllers;
use App\Models\User;

class UserController extends Controller
{
    public function talents()
    {
        return User::whereIn('role', ['worker', 'pro'])
            ->where('id', '!=', auth()->id())
            ->select('id', 'first_name', 'last_name', 'role', 'profile_image')
            ->get();
    }

    public function companies()
    {
        return User::where('role', 'company')
            ->where('id', '!=', auth()->id())
            ->select('id', 'first_name', 'last_name', 'profile_image')
            ->get();
    }
}
