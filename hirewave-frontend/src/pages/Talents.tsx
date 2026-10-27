import { useEffect, useState, useMemo } from "react";
import axiosClient from "../api/axiosClient";
import SearchBar from "../components/SearchBar";
import TalentCard from "../components/TalentCard";

type Talent = {
    id: number;
    first_name: string;
    last_name: string;
    role: string;
    profile_image?: string | null;
    badge?: string;
    unlocked?: boolean;
    settore?: string;
    rating_tecnico?: number;
    skills?: string[];
};

const RUOLI = ["Tutti", "WORKER", "PRO"];
const SETTORI = ["Tutti i settori", "Ristorazione / HoReCa", "Turismo / Hospitality", "Eventi", "Logistica", "IT / Digitale"];

// Skill reali dal curriculum (solo se pubblico); altrimenti il settore dell'onboarding
function getSkills(t: Talent) {
    if (t.skills?.length) return t.skills.slice(0, 2).map(s => s.toUpperCase());
    return t.settore ? [t.settore.toUpperCase()] : [];
}

function SkeletonCard() {
    return (
        <div className="rounded-[20px] overflow-hidden aspect-square bg-slate-200 animate-pulse" />
    );
}

export default function TalentsPage() {
    const [talents, setTalents] = useState<Talent[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filtroRuolo, setFiltroRuolo] = useState("Tutti");
    const [filtroSettore, setFiltroSettore] = useState("Tutti i settori");

    useEffect(() => {
        const load = async () => {
            // Ritorno dal checkout Stripe: conferma lo sblocco prima di caricare
            const sessionId = new URLSearchParams(window.location.search).get("session_id");
            if (sessionId) {
                try {
                    await axiosClient.post("/api/stripe/confirm", { session_id: sessionId });
                } catch (err) {
                    console.error("Errore conferma pagamento:", err);
                }
                window.history.replaceState(null, "", "/talents");
            }

            try {
                const res = await axiosClient.get("/api/talents");
                setTalents(res.data ?? []);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const talentiFiltrati = useMemo(() => {
        const q = search.toLowerCase();
        return talents.filter(t => {
            const matchSearch = !q ||
                (t.first_name ?? "").toLowerCase().includes(q) ||
                (t.last_name ?? "").toLowerCase().includes(q) ||
                t.settore?.toLowerCase().includes(q) ||
                t.skills?.some(s => s.toLowerCase().includes(q));
            const matchRuolo = filtroRuolo === "Tutti" || t.role === filtroRuolo;
            const matchSettore = filtroSettore === "Tutti i settori" || t.settore === filtroSettore;
            return matchSearch && matchRuolo && matchSettore;
        });
    }, [talents, search, filtroRuolo, filtroSettore]);

    return (
        <div className="flex flex-col space-y-4 pb-6">
            <SearchBar placeholder="Cerca talenti..." onSearch={setSearch} />

            {/* Filtro ruolo */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {RUOLI.map(r => (
                    <button
                        key={r}
                        onClick={() => setFiltroRuolo(r)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                            filtroRuolo === r
                                ? "bg-slate-900 text-white"
                                : "border border-slate-300 text-slate-700 hover:bg-slate-50"
                        }`}
                    >
                        {r === "WORKER" ? "Lavoratori" : r === "PRO" ? "Professionisti" : r}
                    </button>
                ))}
            </div>

            {/* Filtro settore */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {SETTORI.map(s => (
                    <button
                        key={s}
                        onClick={() => setFiltroSettore(s)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                            filtroSettore === s
                                ? "bg-blue-600 text-white"
                                : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                    >
                        {s}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {loading
                    ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
                    : talentiFiltrati.length === 0
                        ? <p className="col-span-2 text-slate-400 text-sm text-center py-8">Nessun talento trovato.</p>
                        : talentiFiltrati.map((talent) => (
                            <TalentCard
                                key={talent.id}
                                id={talent.id}
                                firstName={talent.first_name}
                                lastName={talent.last_name}
                                role={talent.role}
                                imageUrl={talent.unlocked && talent.profile_image ? `/storage/${talent.profile_image}` : undefined}
                                skills={getSkills(talent)}
                                badge={talent.badge}
                                unlocked={talent.unlocked}
                            />
                        ))
                }
            </div>
        </div>
    );
}