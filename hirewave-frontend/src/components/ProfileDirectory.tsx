import { useCallback, useEffect, useMemo, useState } from "react";
import axiosClient from "../api/axiosClient";
import SearchBar from "./SearchBar";
import TalentCard from "./TalentCard";
import { disponibilitaLabel, istruzioneLabel } from "../utils/labels";
import type { EsitoMercato } from "../utils/labels";

export type DirectoryProfile = {
    id: number;
    first_name: string;
    last_name: string | null;
    role: string;
    profile_image?: string | null;
    badge?: string;
    unlocked?: boolean;
    saved?: boolean;
    followed?: boolean;
    settore?: string | null;
    skills?: string[];
    rating_tecnico?: number | null;
    livello_istruzione?: string | null;
    can_unlock?: boolean;
    unlock_price?: number;
    piano?: "premium" | "boost" | null;
    // Talenti: dati visibili prima dello sblocco
    rating_reputazionale?: number | null;
    recensioni?: number;
    ral_aspettativa?: string | null;
    ral_mensile?: number | null;
    mercato?: EsitoMercato | null;
    available?: boolean | null;
    disponibilita_da?: string | null;
    disponibilita_a?: string | null;
    zona?: string | null;
    percorso?: string | null;
};

type Chip = { label: string; value: string };

type Props = {
    endpoint: string;
    searchPlaceholder: string;
    emptyText: string;
    // Filtri "rapidi" (es. ruolo, Salvati, Seguite)
    chips: Chip[];
    beforeLoad?: () => Promise<void>;
    // Filtri per rating e retribuzione (solo Talenti)
    filtriTalenti?: boolean;
};

const RATING_MIN = [
    { label: "Qualsiasi rating", value: 0 },
    { label: "Rating 40+", value: 40 },
    { label: "Rating 60+", value: 60 },
    { label: "Rating 80+", value: 80 },
];

// Retribuzione mensile massima che l'azienda offre
const RAL_MAX = [
    { label: "Qualsiasi retribuzione", value: 0 },
    { label: "Fino a €1.000/mese", value: 1000 },
    { label: "Fino a €1.500/mese", value: 1500 },
    { label: "Fino a €2.000/mese", value: 2000 },
    { label: "Fino a €3.000/mese", value: 3000 },
];

const selectFiltro = "border border-slate-200 rounded-full px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white";

const SETTORI = [
    "Tutti i settori",
    "Ristorazione / HoReCa",
    "Turismo / Hospitality",
    "Eventi",
    "Logistica",
    "Commercio / Retail",
    "IT / Digitale",
];

// Skill reali dal curriculum (solo se pubblico); altrimenti il settore dell'onboarding
function getSkills(p: DirectoryProfile) {
    if (p.skills?.length) return p.skills.slice(0, 2).map((s) => s.toUpperCase());
    return p.settore ? [p.settore.toUpperCase()] : [];
}

function matchesChip(p: DirectoryProfile, chip: string) {
    if (chip === "ALL") return true;
    if (chip === "SAVED") return !!p.saved;
    if (chip === "FOLLOWED") return !!p.followed;
    if (chip === "VERIFIED") return p.badge === "verde";
    if (chip === "SEASONAL") return p.percorso === "stagionale";
    if (chip === "MARKET") return p.mercato === "in_linea";
    return p.role === chip;
}

// Disponibilità breve per la card: "Da subito · Pescara"
function disponibilitaCard(p: DirectoryProfile) {
    return [disponibilitaLabel(p), p.zona].filter(Boolean).join(" · ");
}

function SkeletonCard() {
    return <div className="rounded-2xl overflow-hidden h-56 sm:h-64 bg-slate-200 animate-pulse" />;
}

// Elenco a card condiviso da Talenti e Aziende
export default function ProfileDirectory({ endpoint, searchPlaceholder, emptyText, chips, beforeLoad, filtriTalenti }: Props) {
    const [profiles, setProfiles] = useState<DirectoryProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [chip, setChip] = useState("ALL");
    const [settore, setSettore] = useState("Tutti i settori");
    const [ratingMin, setRatingMin] = useState(0);
    const [ralMax, setRalMax] = useState(0);
    // Filtri chiusi all'apertura: si aprono dal pulsante della barra di ricerca
    const [filtersOpen, setFiltersOpen] = useState(false);

    const reload = useCallback(async () => {
        const res = await axiosClient.get(endpoint);
        setProfiles(res.data ?? []);
    }, [endpoint]);

    useEffect(() => {
        const load = async () => {
            await beforeLoad?.();
            try {
                await reload();
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [reload, beforeLoad]);

    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        return profiles.filter((p) => {
            const matchSearch = !q ||
                (p.first_name ?? "").toLowerCase().includes(q) ||
                (p.last_name ?? "").toLowerCase().includes(q) ||
                p.settore?.toLowerCase().includes(q) ||
                p.skills?.some((s) => s.toLowerCase().includes(q)) ||
                p.zona?.toLowerCase().includes(q);
            const matchSettore = settore === "Tutti i settori" || p.settore === settore;
            const matchRating = !ratingMin || (p.rating_tecnico ?? 0) >= ratingMin;
            // Tariffe giornaliere/freelance non hanno un importo mensile: escluse dal filtro
            const matchRal = !ralMax || (p.ral_mensile != null && p.ral_mensile <= ralMax);
            return matchSearch && matchesChip(p, chip) && matchSettore && matchRating && matchRal;
        });
    }, [profiles, search, chip, settore, ratingMin, ralMax]);

    const activeFilters = (chip !== "ALL" ? 1 : 0) + (settore !== "Tutti i settori" ? 1 : 0) + (ratingMin ? 1 : 0) + (ralMax ? 1 : 0);

    const updateSaved = (id: number, saved: boolean) =>
        setProfiles((prev) => prev.map((p) => (p.id === id ? { ...p, saved } : p)));

    return (
        <div className="flex flex-col space-y-4 pb-6">
            <SearchBar
                placeholder={searchPlaceholder}
                onSearch={setSearch}
                onToggleFilters={() => setFiltersOpen((o) => !o)}
                filtersOpen={filtersOpen}
                activeFilters={activeFilters}
            />

            {filtersOpen && (
                <>
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                        {chips.map((c) => (
                            <button
                                key={c.value}
                                onClick={() => setChip(c.value)}
                                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                                    chip === c.value
                                        ? "bg-slate-900 text-white"
                                        : "border border-slate-300 text-slate-700 hover:bg-slate-50"
                                }`}
                            >
                                {c.label}
                            </button>
                        ))}
                    </div>

                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                        {SETTORI.map((s) => (
                            <button
                                key={s}
                                onClick={() => setSettore(s)}
                                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                                    settore === s
                                        ? "bg-blue-600 text-white"
                                        : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                                }`}
                            >
                                {s}
                            </button>
                        ))}
                    </div>

                    {filtriTalenti && (
                        <div className="flex flex-wrap gap-2">
                            <select aria-label="Rating minimo" className={selectFiltro} value={ratingMin} onChange={(e) => setRatingMin(Number(e.target.value))}>
                                {RATING_MIN.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                            </select>
                            <select aria-label="Retribuzione massima" className={selectFiltro} value={ralMax} onChange={(e) => setRalMax(Number(e.target.value))}>
                                {RAL_MAX.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                            </select>
                        </div>
                    )}
                </>
            )}

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {loading
                    ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
                    : filtered.length === 0
                        ? <p className="col-span-2 lg:col-span-3 text-slate-400 text-sm text-center py-8">{emptyText}</p>
                        : filtered.map((p) => (
                            <TalentCard
                                key={p.id}
                                id={p.id}
                                firstName={p.first_name}
                                lastName={p.last_name}
                                role={p.role}
                                imageUrl={p.unlocked && p.profile_image ? `/storage/${p.profile_image}` : undefined}
                                skills={getSkills(p)}
                                badge={p.badge}
                                unlocked={p.unlocked}
                                saved={p.saved}
                                followed={p.followed}
                                rating={p.rating_tecnico}
                                istruzione={istruzioneLabel(p.livello_istruzione)}
                                stelle={p.rating_reputazionale}
                                recensioni={p.recensioni}
                                ral={p.ral_aspettativa}
                                mercato={p.mercato}
                                disponibilita={p.role === "COMPANY" ? undefined : disponibilitaCard(p)}
                                stagionale={p.percorso === "stagionale"}
                                canUnlock={p.can_unlock}
                                unlockPrice={p.unlock_price}
                                piano={p.piano}
                                onSavedChange={updateSaved}
                                // Sbloccato in demo: ricarico l'elenco per mostrare nome e foto
                                onUnlocked={() => reload()}
                            />
                        ))
                }
            </div>
        </div>
    );
}
