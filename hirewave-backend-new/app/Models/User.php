<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable;

    public function posts()
    {
        return $this->hasMany(Post::class);
    }

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'first_name',
        'last_name',
        'email',
        'password',
        'role',
        'profile_image',
        'bio',
        'city',
        'country',
        'website',
        'phone',
        'birth_date',
        'years_experience',
        'contract_type',
        'available',
        'skills',
        'languages',
        'curriculum_public',
        'cv',
        'description',
        'settore',
        'ral_aspettativa',
        'livello_istruzione',
        'dimensione_azienda',
        'anni_esperienza',
        'certificazioni',
        'rating_tecnico',
        'rating_reputazionale',
        'badge',
        'onboarding_completato',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'birth_date' => 'date',
            'available' => 'boolean',
            'skills' => 'array',
            'languages' => 'array',
            'curriculum_public' => 'boolean',
            'rating_reputazionale' => 'float',
        ];
    }
}