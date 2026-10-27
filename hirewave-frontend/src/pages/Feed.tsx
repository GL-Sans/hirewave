import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import SearchBar from "../components/SearchBar";
import axiosClient from "../api/axiosClient";
import type { FeedPost } from "../types/Feed";
import FeedCard from "../components/FeedCard";

// Etichetta del filtro → tipo di contratto salvato nei post (vedi CreatePost)
const FILTRI = [
    { label: "Tutti", value: "" },
    { label: "Tempo indeterminato", value: "Contratto a tempo indeterminato" },
    { label: "Tempo determinato", value: "Contratto a tempo determinato" },
    { label: "Partita IVA", value: "Partita IVA" },
    { label: "Apprendistato", value: "Apprendistato" },
    { label: "Part-time", value: "Part-time" },
    { label: "A chiamata", value: "A chiamata" },
];

const SETTORI = [
    "Tutti i settori",
    "Ristorazione / HoReCa",
    "Turismo / Hospitality",
    "Eventi",
    "Logistica",
    "Commercio / Retail",
    "IT / Digitale",
];

export default function FeedPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [posts, setPosts] = useState<FeedPost[]>([]);
    const [loading, setLoading] = useState(true);

    const [filtroContratto, setFiltroContratto] = useState("");
    const [filtroSettore, setFiltroSettore] = useState("Tutti i settori");
    const [filtersOpen, setFiltersOpen] = useState(true);

    const [search, setSearch] = useState("");
    // Post aperto da un link condiviso (/feed?post=ID)
    const [highlightId, setHighlightId] = useState<number | null>(() => Number(searchParams.get("post")) || null);

    const fetchPosts = useCallback(async (q: string) => {
        setLoading(true);

        try {
            const res = await axiosClient.get("/api/feed", {
                params: { q },
            });

            setPosts(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    // Caricamento iniziale e ricerca con debounce
    useEffect(() => {
        const timeout = setTimeout(() => {
            fetchPosts(search);
        }, search ? 400 : 0);

        return () => clearTimeout(timeout);
    }, [search, fetchPosts]);

    // Scorre fino al post condiviso e lo evidenzia per qualche secondo
    useEffect(() => {
        if (!highlightId || loading) return;
        document.getElementById(`post-${highlightId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
        const t = setTimeout(() => {
            setHighlightId(null);
            setSearchParams({}, { replace: true });
        }, 3000);
        return () => clearTimeout(t);
    }, [highlightId, loading, setSearchParams]);

    const handleSearch = useCallback((q: string) => {
        setSearch(q);
    }, []);

    const removePost = useCallback((id: number) => {
        setPosts((prev) => prev.filter((p) => p.id !== id));
    }, []);

    const postsFiltrati = posts.filter((p) => {
        if (filtroContratto && p.contract_type !== filtroContratto) return false;
        if (filtroSettore !== "Tutti i settori" && p.user.settore !== filtroSettore) return false;
        return true;
    });

    const activeFilters = (filtroContratto ? 1 : 0) + (filtroSettore !== "Tutti i settori" ? 1 : 0);

    return (
        <div className="space-y-4">
            <SearchBar
                placeholder="Cerca opportunità…"
                onSearch={handleSearch}
                onToggleFilters={() => setFiltersOpen((o) => !o)}
                filtersOpen={filtersOpen}
                activeFilters={activeFilters}
            />

            {filtersOpen && (
                <>
                    {/* Filtri contratto */}
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                        {FILTRI.map((f) => (
                            <button
                                key={f.label}
                                type="button"
                                onClick={() => setFiltroContratto(f.value)}
                                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                                    filtroContratto === f.value
                                        ? "bg-slate-900 text-white"
                                        : "border border-slate-300 text-slate-700 hover:bg-slate-50"
                                }`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>

                    {/* Filtri settore (settore dell'autore, scelto nell'onboarding) */}
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                        {SETTORI.map((s) => (
                            <button
                                key={s}
                                type="button"
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
                </>
            )}

            {loading && (
                <p className="text-sm text-slate-500">
                    Aggiornamento risultati...
                </p>
            )}

            <div className="grid md:grid-cols-2 gap-4">
                {!loading && postsFiltrati.length === 0 ? (
                    <p className="text-slate-400 text-sm col-span-2 text-center py-8">
                        Nessun risultato trovato.
                    </p>
                ) : (
                    postsFiltrati.map((post) => (
                        <FeedCard
                            key={post.id}
                            postId={post.id}
                            type={post.type}
                            title={post.title}
                            description={post.description}
                            location={post.location ?? "—"}
                            timeAgo={formatTimeAgo(post.created_at)}
                            sponsored={post.sponsored}
                            imageUrl={
                                post.image
                                    ? `/storage/${post.image}`
                                    : undefined
                            }
                            tags={
                                post.type === "job"
                                    ? ["Annuncio"]
                                    : ["Richiesta"]
                            }
                            contractType={post.contract_type ?? "—"}
                            budget={post.budget ?? "—"}
                            budgetType={post.budget_type ?? null}
                            author={{
                                id: post.user.id,
                                first_name: post.user.first_name,
                                last_name: post.user.last_name,
                                role: post.user.role,
                                profile_image: post.user.profile_image,
                            }}
                            post={post}
                            highlighted={post.id === highlightId}
                            onRemoved={removePost}
                            onDeleted={removePost}
                        />
                    ))
                )}
            </div>
        </div>
    );
}

function formatTimeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));

    if (hours < 1) return `${minutes} minuti fa`;
    if (hours < 24) return `${hours} ore fa`;

    return `${Math.floor(hours / 24)} giorni fa`;
}
