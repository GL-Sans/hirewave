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

export const PREMIUM_ANNUALE_PRICE = "149,99";

// Fasce di retribuzione: le stesse nell'onboarding e nel curriculum
export const RETRIBUZIONI = ["Meno di €1.000/mese", "€1.000 – €1.500/mese", "€1.500 – €2.000/mese", "€2.000 – €3.000/mese", "Oltre €3.000/mese", "Tariffa giornaliera / Freelance"];

// Retribuzione attesa rispetto agli annunci del settore (App\Support\Mercato)
export type EsitoMercato = "in_linea" | "sopra" | "sotto";

export const MERCATO: Record<EsitoMercato, { label: string; classi: string }> = {
    in_linea: { label: "In linea con mercato", classi: "bg-green-50 text-green-700 border-green-200" },
    sopra: { label: "Sopra il mercato", classi: "bg-amber-50 text-amber-700 border-amber-200" },
    sotto: { label: "Sotto il mercato", classi: "bg-sky-50 text-sky-700 border-sky-200" },
};

// "2027-06-01" → "1 giu 2027"
export function dataBreve(iso?: string | null) {
    if (!iso) return "";
    return new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric" });
}

// Periodo di disponibilità leggibile: "Da subito", "Dal 1 giu 2027 al 30 set 2027"
export function disponibilitaLabel(p: { available?: boolean | null; disponibilita_da?: string | null; disponibilita_a?: string | null }) {
    if (p.available === false) return "Non disponibile";
    if (!p.disponibilita_da) return p.available ? "Disponibile" : "";
    const da = p.disponibilita_da.slice(0, 10);
    const oggi = new Date().toISOString().slice(0, 10);
    const inizio = da <= oggi ? "Da subito" : `Dal ${dataBreve(da)}`;
    return p.disponibilita_a ? `${inizio} al ${dataBreve(p.disponibilita_a)}` : inizio;
}
