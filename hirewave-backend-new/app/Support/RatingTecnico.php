<?php
namespace App\Support;

/**
 * Rating tecnico (0-100) di lavoratori e professionisti:
 * istruzione (max 30) + esperienza (max 40) + certificazioni (30).
 */
class RatingTecnico
{
    private const ISTRUZIONE = [
        'licenza_media' => 5,
        'diploma' => 15,
        'laurea_triennale' => 22,
        'laurea_magistrale' => 30,
    ];

    public static function calcola(?string $livelloIstruzione, ?int $anniEsperienza, ?string $certificazioni): int
    {
        $score = self::ISTRUZIONE[$livelloIstruzione] ?? 10;

        $anni = (int) $anniEsperienza;
        if ($anni >= 10) $score += 40;
        elseif ($anni >= 5) $score += 30;
        elseif ($anni >= 3) $score += 20;
        elseif ($anni >= 1) $score += 10;

        if (!empty($certificazioni)) $score += 30;

        return min($score, 100);
    }
}
