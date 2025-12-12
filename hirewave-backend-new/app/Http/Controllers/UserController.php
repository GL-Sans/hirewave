<?php 

namespace App\Http\Controllers;
use App\Models\User;

class UserController extends Controller
{
    public function talents()
    {
        return User::whereIn('role', ['worker', 'pro'])
            ->select('id', 'name', 'role')
            ->get();
    }

    public function companies()
    {
        return User::where('role', 'company')
            ->select('id', 'name')
            ->get();
    }
}
