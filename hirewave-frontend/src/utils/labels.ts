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
