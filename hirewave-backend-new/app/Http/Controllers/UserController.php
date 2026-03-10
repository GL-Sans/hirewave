<?php 

namespace App\Http\Controllers;
use App\Models\User;

class UserController extends Controller
{
    public function talents()
    {
        return User::whereIn('role', ['worker', 'pro'])
<<<<<<< HEAD
            ->select('id', 'name', 'role')
=======
            ->where('id', '!=', auth()->id())
            ->select('id', 'first_name', 'last_name', 'role', 'profile_image')
>>>>>>> dev_stefano
            ->get();
    }

    public function companies()
    {
        return User::where('role', 'company')
<<<<<<< HEAD
            ->select('id', 'name')
=======
            ->where('id', '!=', auth()->id())
            ->select('id', 'first_name', 'last_name', 'profile_image')
>>>>>>> dev_stefano
            ->get();
    }
}
