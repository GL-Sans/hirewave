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
        'budget_type',
        'image',
    ];

    protected $appends = ['image_url'];

    public function getImageUrlAttribute()
    {
        return $this->image ? config('app.url') . '/storage/' . $this->image : null;
    }

    // Relazione: un post appartiene a un utente
    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
