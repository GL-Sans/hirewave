# HireWave

Applicazione full-stack composta da un backend Laravel e un frontend Vite/React.

---

## Requisiti

Prima di iniziare, assicurati di avere installato:

| Tool | Versione minima | Download |
|------|----------------|---------|
| PHP | 8.4+ | https://windows.php.net/download (Windows) oppure `brew install php` (Mac) |
| Composer | qualsiasi | https://getcomposer.org/download |
| Node.js + npm | 18+ | https://nodejs.org |
| MySQL | qualsiasi | https://dev.mysql.com/downloads/ oppure tramite XAMPP/MAMP |
| Git | qualsiasi | https://git-scm.com |

> ⚠️ **Windows**: scarica PHP **VS17 x64 Non Thread Safe** (zip), estrailo in `C:\php84`, aggiungilo al PATH di sistema e rinomina `php.ini-development` in `php.ini`.

---

## Installazione

### 1. Clona il progetto

```bash
git clone -b master https://github.com/GL-Sans/hirewave <percorso-destinazione>
cd <percorso-destinazione>
```

---

### 2. Backend (Laravel)

```bash
cd backend
```

#### Installa le dipendenze PHP
```bash
composer install
```

> ⚠️ **Windows**: se Composer dà errore per estensioni mancanti, apri `php.ini` e decommenta (rimuovi il `;`) queste righe: P.S. (se non le trovi non aggiungerle)
> ```
> extension_dir = "C:\php84\ext"
> extension=openssl
> extension=fileinfo
> extension=mbstring
> extension=pdo_mysql
> extension=tokenizer
> extension=xml
> extension=ctype
> ```

#### Configura il file .env
```bash
cp .env.example .env
```

Apri `.env` e imposta le credenziali del tuo database MySQL:
```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=hirewave
DB_USERNAME=root
DB_PASSWORD=la_tua_password
```

Aggiungi anche:
```env
SANCTUM_STATEFUL_DOMAINS=localhost:5173
SESSION_DRIVER=cookie
```

#### Genera la chiave dell'applicazione
```bash
php artisan key:generate
```

#### Crea il database

Accedi a MySQL e crea il database:
```sql
CREATE DATABASE hirewave;
```

Oppure crealo tramite phpMyAdmin (`http://localhost/phpmyadmin`).

#### Esegui le migration
```bash
php artisan migrate:fresh
```

#### Avvia il server backend
```bash
php artisan serve
```
Il backend sarà disponibile su `http://localhost:8000`

---

### 3. Frontend (Vite / React)

```bash
cd ../frontend
npm install
npm run dev
```

Il frontend sarà disponibile su `http://localhost:5173`

---

## Avvio rapido (dopo la prima installazione)

Apri **due terminali separati**:

```bash
# Terminale 1 — Backend
cd backend
php artisan serve

# Terminale 2 — Frontend
cd frontend
npm run dev
```

---

## Struttura del progetto

```
hirewave/
├── backend/     → API Laravel (PHP)
└── frontend/    → Interfaccia utente (Vite + React)
```

---

## Problemi comuni

### `vendor/autoload.php` non trovato
Esegui `composer install` nella cartella `backend/`.

### Errore versione PHP (`php >=8.4`)
Aggiorna PHP alla versione 8.4 o superiore. Verifica con `php --version`.

### Estensione `openssl` o `fileinfo` mancante
Abilita le estensioni nel `php.ini` come descritto nella sezione Backend.

### `Column already exists` durante le migration
Il database non è pulito. Usa `php artisan migrate:fresh` per ricrearlo da zero.

### Errore `Session store not set`
Assicurati che nel `.env` siano presenti:
```env
SANCTUM_STATEFUL_DOMAINS=localhost:5173
SESSION_DRIVER=cookie
```