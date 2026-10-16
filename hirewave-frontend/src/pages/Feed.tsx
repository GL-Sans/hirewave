import { useEffect, useState, useCallback } from "react";
import SearchBar from "../components/SearchBar";
import axiosClient from "../api/axiosClient";
import type { FeedPost } from "../types/Feed";
import FeedCard from "../components/FeedCard";
import { useAuth } from "../context/AuthContext";

const FILTRI = ["Tutti", "Stagionale", "Freelance", "Occasionale", "Part-time"];

const SETTORI = [
    "Tutti i settori",
    "Ristorazione / HoReCa",
    "Turismo / Hospitality",
    "Eventi",
    "Logistica",
    "IT / Digitale",
];

export default function FeedPage() {
    useAuth();

    const [posts, setPosts] = useState<FeedPost[]>([]);
    const [loading, setLoading] = useState(true);

    const [filtroContratto, setFiltroContratto] = useState("Tutti");
    const [filtroSettore, setFiltroSettore] = useState("Tutti i settori");

    const [search, setSearch] = useState("");

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

    // Caricamento iniziale
    useEffect(() => {
        fetchPosts("");
    }, [fetchPosts]);

    // Ricerca con debounce
    useEffect(() => {
        const timeout = setTimeout(() => {
            fetchPosts(search);
        }, 400);

        return () => clearTimeout(timeout);
    }, [search, fetchPosts]);

    const handleSearch = useCallback((q: string) => {
        setSearch(q);
    }, []);

    const postsFiltrati = posts.filter((p) => {
        if (
            filtroContratto !== "Tutti" &&
            p.contract_type?.toLowerCase() !== filtroContratto.toLowerCase()
        ) {
            return false;
        }

        return true;
    });

    return (
        <div className="space-y-4">
            <SearchBar
                placeholder="Cerca opportunità…"
                onSearch={handleSearch}
            />

            {/* Filtri contratto */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {FILTRI.map((f) => (
                    <button
                        key={f}
                        type="button"
                        onClick={() => setFiltroContratto(f)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                            filtroContratto === f
                                ? "bg-slate-900 text-white"
                                : "border border-slate-300 text-slate-700 hover:bg-slate-50"
                        }`}
                    >
                        {f}
                    </button>
                ))}
            </div>

            {/* Filtri settore */}
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

            {loading && (
                <p className="text-sm text-slate-500">
                    Aggiornamento risultati...
                </p>
            )}

            <div className="grid md:grid-cols-2 gap-4">
                {postsFiltrati.length === 0 ? (
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