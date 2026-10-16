<?php
namespace Database\Seeders;
use App\Models\Post;
use App\Models\User;
use Illuminate\Database\Seeder;

class PostSeeder extends Seeder
{
    public function run(): void
    {
        $workers = User::whereIn('role', ['WORKER', 'PRO'])->get();
        $posts = [
            ['title' => 'Disponibile come cameriere estate 2027', 'description' => 'Cerco posizione stagionale giugno-settembre zona Pescara-Francavilla.', 'type' => 'service', 'location' => 'Pescara', 'contract_type' => 'stagionale', 'budget' => 1400, 'budget_type' => 'mensile'],
            ['title' => 'Chef de partie cerca nuova sfida', 'description' => 'Disponibile da aprile. Specializzato in primi piatti e pesce.', 'type' => 'service', 'location' => 'Abruzzo', 'contract_type' => 'stagionale', 'budget' => 1800, 'budget_type' => 'mensile'],
            ['title' => 'Servizi fotografici eventi e matrimoni', 'description' => 'Fotografa professionista disponibile per eventi estivi.', 'type' => 'service', 'location' => 'Pescara', 'contract_type' => 'freelance', 'budget' => 300, 'budget_type' => 'giornaliero'],
            ['title' => 'Sviluppo web React e Laravel', 'description' => 'Freelance disponibile per progetti web SPA e API REST.', 'type' => 'service', 'location' => 'Remoto', 'contract_type' => 'freelance', 'budget' => 250, 'budget_type' => 'giornaliero'],
            ['title' => 'Bartender stagione estiva 2027', 'description' => 'Barista con corso AIBES cerca posizione in stabilimento balneare.', 'type' => 'service', 'location' => 'Pescara', 'contract_type' => 'stagionale', 'budget' => 1300, 'budget_type' => 'mensile'],
            ['title' => 'Hostess ed addetto sala eventi', 'description' => 'Esperienza in fiere e congressi. Disponibile weekend e festivi.', 'type' => 'service', 'location' => 'Abruzzo', 'contract_type' => 'occasionale', 'budget' => 120, 'budget_type' => 'giornaliero'],
        ];
        foreach ($posts as $i => $data) {
            Post::create([...$data, 'user_id' => $workers[$i % count($workers)]->id, 'sponsored' => false]);
        }
    }
}