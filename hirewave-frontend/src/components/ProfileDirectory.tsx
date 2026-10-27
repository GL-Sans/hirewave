import { useEffect, useMemo, useState } from "react";
import axiosClient from "../api/axiosClient";
import SearchBar from "./SearchBar";
import TalentCard from "./TalentCard";

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
};

type Chip = { label: string; value: string };

type Props = {
    endpoint: string;
    searchPlaceholder: string;
    emptyText: string;
    // Filtri "rapidi" (es. ruolo, Salvati, Seguite)
    chips: Chip[];
    beforeLoad?: () => Promise<void>;
};

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
    return p.role === chip;
}

function SkeletonCard() {
    return <div className="rounded-[20px] overflow-hidden aspect-square bg-slate-200 animate-pulse" />;
}

// Elenco a card condiviso da Talenti e Aziende
export default function ProfileDirectory({ endpoint, searchPlaceholder, emptyText, chips, beforeLoad }: Props) {
    const [profiles, setProfiles] = useState<DirectoryProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [chip, setChip] = useState("ALL");
    const [settore, setSettore] = useState("Tutti i settori");
    const [filtersOpen, setFiltersOpen] = useState(true);

    useEffect(() => {
        const load = async () => {
            await beforeLoad?.();
            try {
                const res = await axiosClient.get(endpoint);
                setProfiles(res.data ?? []);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [endpoint, beforeLoad]);

    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        return profiles.filter((p) => {
            const matchSearch = !q ||
                (p.first_name ?? "").toLowerCase().includes(q) ||
                (p.last_name ?? "").toLowerCase().includes(q) ||
                p.settore?.toLowerCase().includes(q) ||
                p.skills?.some((s) => s.toLowerCase().includes(q));
            const matchSettore = settore === "Tutti i settori" || p.settore === settore;
            return matchSearch && matchesChip(p, chip) && matchSettore;
        });
    }, [profiles, search, chip, settore]);

    const activeFilters = (chip !== "ALL" ? 1 : 0) + (settore !== "Tutti i settori" ? 1 : 0);

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
                </>
            )}

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
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
                                onSavedChange={updateSaved}
                            />
                        ))
                }
            </div>
        </div>
    );
}
