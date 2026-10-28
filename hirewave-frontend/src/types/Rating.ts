// Stessa forma di RatingTecnico::dettaglio() nel backend
export type StatoVoce = "mancante" | "dichiarato" | "parziale" | "verificato";

export type ElementoCertificazione = {
    nome: string | null;
    punti: number;
    peso?: number;
    stato: "dichiarato" | "verificato" | "in_verifica" | "oltre_limite";
};

export type VoceRating = {
    chiave: "istruzione" | "esperienza" | "certificazioni";
    etichetta: string;
    valore: string;
    punti: number;
    max: number;
    stato: StatoVoce;
    in_verifica: boolean;
    spiegazione: string;
    potenziale: number;
    anni?: number;
    anni_verificati?: number;
    elementi?: ElementoCertificazione[];
};

export type ConsiglioRating = {
    azione: string;
    punti: number;
    tipo: "istruzione" | "esperienza" | "esperienza_anno" | "certificazione" | "certificazione_nuova";
    riferimento?: string;
    nota?: string;
};

export type RatingDettaglio = {
    versione: number;
    totale: number;
    max: number;
    max_dichiarato: number;
    verificato: boolean;
    voci: VoceRating[];
    consigli?: ConsiglioRating[];
};

export type RatingStorico = {
    valore_precedente: number;
    valore: number;
    motivo: string;
    created_at: string;
};

export type TipoDocumento = "istruzione" | "esperienza" | "certificazione";

export type Documento = {
    id: number;
    tipo: TipoDocumento;
    descrizione: string;
    riferimento: string | null;
    anni: number | null;
    anno: number | null;
    nome_file: string;
    stato: "in_verifica" | "verificato" | "rifiutato" | "revisione_manuale";
    esito: string | null;
    created_at: string;
    verificato_at: string | null;
};

// Cosa precompilare quando si apre il caricamento da un consiglio
export type DocumentoPreset = { tipo: TipoDocumento; riferimento?: string };
