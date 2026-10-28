const ROLE_LABELS: Record<string, string> = {
    WORKER: "Lavoratore",
    PRO: "Professionista",
    COMPANY: "Azienda",
};

export function roleLabel(role?: string | null) {
    return role ? ROLE_LABELS[role] ?? role : "";
}

const COMPANY_SIZE_LABELS: Record<string, string> = {
    micro: "Micro (1-5 dipendenti)",
    piccola: "Piccola (6-20 dipendenti)",
    media: "Media (21-50 dipendenti)",
    grande: "Grande (50+ dipendenti)",
};

export function companySizeLabel(size?: string | null) {
    return size ? COMPANY_SIZE_LABELS[size] ?? size : "";
}

export const ISTRUZIONE_OPTIONS = [
    { value: "licenza_media", label: "Licenza media" },
    { value: "diploma", label: "Diploma" },
    { value: "laurea_triennale", label: "Laurea triennale" },
    { value: "laurea_magistrale", label: "Laurea magistrale" },
];

export function istruzioneLabel(livello?: string | null) {
    return ISTRUZIONE_OPTIONS.find((o) => o.value === livello)?.label ?? "";
}

// Tariffe Pay-per-Unlock (business plan, par. 5.2): stesse cifre di StripeController
export function unlockPrice(badge?: string | null) {
    return badge === "verde" ? "29,99" : "14,99";
}

export const VERIFICA_PREMIUM_PRICE = "9,99";

// Centesimi dal backend → "29,99"
export function euro(cents: number) {
    return (cents / 100).toFixed(2).replace(".", ",");
}

// Piani dei lavoratori (business plan, par. 8.1): stesse cifre di Abbonamento.php
export const PIANI = {
    premium: { nome: "Premium", prezzo: "14,99" },
    boost: { nome: "Boost", prezzo: "29,99" },
} as const;

export type Piano = keyof typeof PIANI;
