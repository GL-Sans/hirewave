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

    public function documenti()
    {
        return $this->hasMany(DocumentoVerifica::class);
    }

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    // Solo dati che l'utente può scegliere. Ruolo, badge, rating, file e stati
    // interni NON sono qui: si impostano esplicitamente con forceFill nei
    // controller, così nessuna richiesta può modificarli per errore.
    protected $fillable = [
        'first_name',
        'last_name',
        'email',
        'password',
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
        'description',
        'settore',
        'ral_aspettativa',
        'livello_istruzione',
        'dimensione_azienda',
        'anni_esperienza',
        'certificazioni',
        'notifications_enabled',
        'disponibilita_da',
        'disponibilita_a',
        'zona',
        'istituto',
        'anno_titolo',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
        // Identificativi degli account social: non servono al frontend
        'google_id',
        'linkedin_id',
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
            'notifications_enabled' => 'boolean',
            'has_password' => 'boolean',
            'is_admin' => 'boolean',
            'rating_tecnico' => 'integer',
            'anni_esperienza' => 'integer',
            'abbonamento_scade_at' => 'datetime',
            'disponibilita_da' => 'date:Y-m-d',
            'disponibilita_a' => 'date:Y-m-d',
            'anno_titolo' => 'integer',
            'sblocchi_gratuiti_usati' => 'integer',
        ];
    }
}