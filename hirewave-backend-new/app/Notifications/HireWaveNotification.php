<?php
namespace App\Notifications;

use Illuminate\Notifications\Notification;

/**
 * Notifica in-app salvata nel database e mostrata nella pagina Notifiche.
 * kind: message | review | unlock | job_post | follow
 */
class HireWaveNotification extends Notification
{
    public function __construct(
        private string $kind,
        private string $title,
        private string $body,
        private ?string $url = null,
        private array $extra = [],
    ) {}

    public function via(object $notifiable): array
    {
        // Rispetta l'interruttore "Notifiche" delle Impostazioni
        return $notifiable->notifications_enabled ? ['database'] : [];
    }

    public function toArray(object $notifiable): array
    {
        return array_merge($this->extra, [
            'kind' => $this->kind,
            'title' => $this->title,
            'body' => $this->body,
            'url' => $this->url,
        ]);
    }
}
