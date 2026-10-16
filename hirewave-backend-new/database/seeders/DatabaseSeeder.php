<?php
namespace Database\Seeders;

use App\Models\User;
use App\Models\Post;
use App\Models\Tag;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Tags
        $tags = ['ristorazione', 'eventi', 'social-media', 'grafica', 'fotografia', 'siti-web', 'react', 'laravel'];
        foreach ($tags as $tag) {
            Tag::firstOrCreate(['name' => $tag]);
        }

        // Utenti fittizi
        $workers = [
            ['first_name' => 'Marco', 'last_name' => 'Ferretti', 'role' => 'WORKER', 'description' => 'Cameriere con 5 anni di esperienza in ristoranti stellati a Pescara.'],
            ['first_name' => 'Sara', 'last_name' => 'Conti', 'role' => 'WORKER', 'description' => 'Bagnina stagionale, patente BLSD, 3 stagioni al Lido Riccione.'],
            ['first_name' => 'Luca', 'last_name' => 'Marino', 'role' => 'PRO', 'description' => 'Chef de partie specializzato in cucina abruzzese e pesce fresco.'],
            ['first_name' => 'Giulia', 'last_name' => 'De Luca', 'role' => 'PRO', 'description' => 'Grafica e social media manager, 4 anni esperienza PMI locali.'],
            ['first_name' => 'Antonio', 'last_name' => 'Ruggieri', 'role' => 'WORKER', 'description' => 'Barista e bartender, corso AIBES completato, disponibile stagione estiva.'],
            ['first_name' => 'Chiara', 'last_name' => 'Santoro', 'role' => 'PRO', 'description' => 'Fotografa eventi e matrimoni, portfolio su richiesta.'],
            ['first_name' => 'Davide', 'last_name' => 'Esposito', 'role' => 'WORKER', 'description' => 'Addetto sala e hostess eventi, esperienza fiere e congressi.'],
            ['first_name' => 'Federica', 'last_name' => 'Lombardi', 'role' => 'PRO', 'description' => 'Sviluppatrice web React/Laravel, freelance da 3 anni.'],
            ['first_name' => 'Roberto', 'last_name' => 'Mancini', 'role' => 'WORKER', 'description' => 'Magazziniere e logistica, patente C, disponibile immediata.'],
            ['first_name' => 'Valentina', 'last_name' => 'Bruno', 'role' => 'WORKER', 'description' => 'Receptionist hotel, inglese B2, esperienza catene alberghiere Abruzzo.'],
        ];

        $companies = [
            ['first_name' => 'Hotel', 'last_name' => 'Excelsior', 'role' => 'COMPANY', 'description' => 'Hotel 4 stelle sul lungomare di Pescara, 80 camere.'],
            ['first_name' => 'Ristorante', 'last_name' => 'Da Luigi', 'role' => 'COMPANY', 'description' => 'Ristorante di pesce tipico abruzzese, 120 coperti.'],
        ];

        $createdWorkers = [];
        foreach ($workers as $i => $data) {
            $user = User::create([
                ...$data,
                'email' => strtolower($data['first_name'] . '.' . $data['last_name']) . '@example.com',
                'password' => Hash::make('password'),
            ]);
            $createdWorkers[] = $user;
        }

        foreach ($companies as $data) {
            User::create([
                ...$data,
                'email' => strtolower($data['first_name'] . '.' . $data['last_name']) . '@example.com',
                'password' => Hash::make('password'),
            ]);
        }

        // Post per i worker
        $posts = [
            ['title' => 'Disponibile come cameriere estate 2027', 'description' => 'Cerco posizione stagionale giugno-settembre in ristorante o stabilimento balneare zona Pescara-Francavilla.', 'type' => 'offer', 'location' => 'Pescara', 'contract_type' => 'stagionale', 'budget' => 1400, 'budget_type' => 'mensile'],
            ['title' => 'Chef de partie cerca nuova sfida', 'description' => 'Disponibile da aprile per stagione estiva. Specializzato in primi piatti e pesce. Referenze verificabili.', 'type' => 'offer', 'location' => 'Abruzzo', 'contract_type' => 'stagionale', 'budget' => 1800, 'budget_type' => 'mensile'],
            ['title' => 'Servizi fotografici eventi e matrimoni', 'description' => 'Fotografa professionista disponibile per eventi estivi. Pacchetti personalizzati per stabilimenti balneari.', 'type' => 'offer', 'location' => 'Pescara', 'contract_type' => 'freelance', 'budget' => 300, 'budget_type' => 'giornaliero'],
            ['title' => 'Sviluppo web React e Laravel', 'description' => 'Freelance disponibile per progetti web. Specializzata in SPA e API REST. Preventivo gratuito.', 'type' => 'offer', 'location' => 'Remoto', 'contract_type' => 'freelance', 'budget' => 250, 'budget_type' => 'giornaliero'],
            ['title' => 'Bartender stagione estiva 2027', 'description' => 'Barista con corso AIBES cerca posizione in cocktail bar o stabilimento balneare. Disponibile full time.', 'type' => 'offer', 'location' => 'Pescara', 'contract_type' => 'stagionale', 'budget' => 1300, 'budget_type' => 'mensile'],
            ['title' => 'Hostess ed addetto sala eventi', 'description' => 'Esperienza in fiere, congressi e eventi aziendali. Disponibile weekend e festivi.', 'type' => 'offer', 'location' => 'Abruzzo', 'contract_type' => 'occasionale', 'budget' => 120, 'budget_type' => 'giornaliero'],
        ];

        foreach ($posts as $i => $postData) {
            $user = $createdWorkers[$i] ?? $createdWorkers[0];
            Post::create([
                ...$postData,
                'user_id' => $user->id,
                'sponsored' => false,
            ]);
        }
    }
}
