<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Post extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'type',
        'title',
        'description',
        'location',
        'sponsored',
        'contract_type',
        'budget',
    ];

    // Relazione: un post appartiene a un utente
    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
