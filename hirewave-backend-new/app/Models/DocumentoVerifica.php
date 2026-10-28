<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DocumentoVerifica extends Model
{
    protected $table = 'documenti_verifica';

    // Stato, esito e revisore si impostano solo dal codice di verifica
    protected $fillable = ['tipo', 'riferimento', 'anni', 'anno'];

    // Il percorso del file non esce mai: si scarica dall'apposito endpoint
    protected $hidden = ['file_path'];

    protected function casts(): array
    {
        return [
            'anni' => 'integer',
            'anno' => 'integer',
            'dimensione' => 'integer',
            'verificato_at' => 'datetime',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /** Documenti che bloccano la modifica del dato finché non c'è un esito */
    public function scopeAperti($query)
    {
        return $query->whereIn('stato', ['in_verifica', 'revisione_manuale']);
    }
}
