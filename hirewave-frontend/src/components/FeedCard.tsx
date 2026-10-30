import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { UserIcon } from "@heroicons/react/24/solid";
import {
    EllipsisHorizontalIcon,
    EyeSlashIcon,
    FlagIcon,
    PencilSquareIcon,
    ShareIcon,
    TrashIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../context/AuthContext";
import { profilePath } from "../utils/profilePath";
import ShareSheet from "./ShareSheet";
import axiosClient from "../api/axiosClient";
import type { FeedPost } from "../types/Feed";
import PostEditModal from "./PostEditModal";
import ReportModal from "./ReportModal";
import { useBackClose } from "../hooks/useBackClose";

type FeedCardProps = {
    postId: number;
    type: "job" | "service";
    title: string;
    location: string;
    description?: string | null;
    timeAgo: string;
    sponsored?: boolean;
    imageUrl?: string;
    tags: string[];
    contractType: string;
    budget: string;
    budgetType?: string | null;
    author: {
        id: number;
        first_name: string;
        last_name?: string | null;
        role: "WORKER" | "PRO" | "COMPANY";
        profile_image?: string | null;
    };
    // Dati completi del post: servono alla modifica
    post?: FeedPost;
    highlighted?: boolean;
    onUpdated?: (post: FeedPost) => void;
    onDeleted?: (postId: number) => void;
    onRemoved?: (postId: number) => void;
};

const menuItem =
    "w-full flex items-center gap-3 px-4! py-2! text-sm text-left border-0! rounded-none! bg-transparent hover:bg-slate-50";

export default function FeedCard(props: FeedCardProps) {
    const {
        postId,
        type,
        title,
        description,
        location,
        timeAgo,
        sponsored,
        imageUrl,
        tags,
        contractType,
        budget,
        budgetType,
        author,
        post,
        highlighted,
        onUpdated,
        onDeleted,
        onRemoved,
    } = props;

    const { user } = useAuth();
    const [menuOpen, setMenuOpen] = useState(false);
    const [editing, setEditing] = useState(false);
    const [reporting, setReporting] = useState(false);
    const [sharing, setSharing] = useState(false);
    const [hidden, setHidden] = useState<null | "hidden" | "reported">(null);
    const [feedback, setFeedback] = useState("");
    const [candidato, setCandidato] = useState(!!post?.candidato);
    const [candidando, setCandidando] = useState(false);
    const [erroreCandidatura, setErroreCandidatura] = useState("");
    const menuRef = useRef<HTMLDivElement>(null);
    useBackClose(menuOpen, () => setMenuOpen(false));

    useEffect(() => {
        if (!menuOpen) return;
        const close = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
        };
        document.addEventListener("mousedown", close);
        return () => document.removeEventListener("mousedown", close);
    }, [menuOpen]);

    useEffect(() => {
        if (!feedback) return;
        const t = setTimeout(() => setFeedback(""), 2500);
        return () => clearTimeout(t);
    }, [feedback]);

    const isCompanyViewer = user?.role === "COMPANY";
    const isCompanyAuthor = author.role === "COMPANY";
    const isWorkerAuthor = author.role === "WORKER";
    const isOwnPost = user?.id === author.id;

    /**
     * Pulsanti:
     * - azienda → contatta lavoratori e professionisti (mai altre aziende)
     * - lavoratori e professionisti → "Candidati ora" solo sugli annunci di lavoro;
     *   i post "servizio" sono offerte rivolte alle aziende, non ad altri lavoratori
     */
    const showCompanyCTA = isCompanyViewer && !isCompanyAuthor;
    const showApplyCTA = !isCompanyViewer && type === "job";
    const showCTA = !isOwnPost && (showCompanyCTA || showApplyCTA);

    const authorPath = profilePath(author);

    // Apre la tendina di condivisione (WhatsApp, SMS, email, social, copia link…)
    const handleShare = () => {
        setMenuOpen(false);
        setSharing(true);
    };

    const handleHide = async () => {
        setMenuOpen(false);
        try {
            await axiosClient.post(`/api/posts/${postId}/hide`);
            setHidden("hidden");
        } catch {
            setFeedback("Operazione non riuscita");
        }
    };

    const handleUndoHide = async () => {
        try {
            await axiosClient.delete(`/api/posts/${postId}/hide`);
            setHidden(null);
        } catch {
            setFeedback("Operazione non riuscita");
        }
    };

    // La candidatura finisce in "Candidature inviate" nel mio profilo
    const handleCandidatura = async () => {
        setCandidando(true);
        setErroreCandidatura("");
        try {
            if (candidato) {
                if (!window.confirm("Ritirare la candidatura?")) return;
                await axiosClient.delete(`/api/posts/${postId}/candidatura`);
                setCandidato(false);
            } else {
                await axiosClient.post(`/api/posts/${postId}/candidatura`);
                setCandidato(true);
            }
        } catch (err: any) {
            setErroreCandidatura(err?.response?.data?.message ?? "Candidatura non riuscita.");
        } finally {
            setCandidando(false);
        }
    };

    const handleDelete = async () => {
        setMenuOpen(false);
        if (!window.confirm("Eliminare definitivamente questo post?")) return;
        try {
            await axiosClient.delete(`/api/posts/${postId}`);
            onDeleted?.(postId);
        } catch {
            setFeedback("Eliminazione non riuscita");
        }
    };

    // Post nascosto o segnalato: al suo posto un avviso (con annulla per "non mi interessa")
    if (hidden) {
        return (
            <article className="bg-white rounded-2xl shadow-sm p-4 flex flex-col items-center justify-center gap-2 text-center text-sm text-slate-500 min-h-[120px]">
                {hidden === "hidden" ? (
                    <>
                        <p>Post nascosto. Ne vedrai meno di simili.</p>
                        <div className="flex gap-3">
                            <button onClick={handleUndoHide} className="text-blue-600 font-semibold border-0! p-0! bg-transparent">
                                Annulla
                            </button>
                            <button onClick={() => onRemoved?.(postId)} className="text-slate-400 border-0! p-0! bg-transparent">
                                Chiudi
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <p>Grazie per la segnalazione. Il post non ti verrà più mostrato.</p>
                        <button onClick={() => onRemoved?.(postId)} className="text-slate-400 border-0! p-0! bg-transparent">
                            Chiudi
                        </button>
                    </>
                )}
            </article>
        );
    }

    return (
        <article
            id={`post-${postId}`}
            className={`bg-white rounded-2xl shadow-sm overflow-hidden flex flex-col h-full transition-shadow ${
                highlighted ? "ring-2 ring-blue-500" : ""
            }`}
        >

            {/* HEADER */}
            <div className="px-4 pt-3 flex items-center justify-between gap-2 text-xs text-slate-500">
                <span className="truncate">
                    {location} · {timeAgo}
                </span>

                <div className="flex items-center gap-1 shrink-0">
                    {sponsored && (
                        <span className="text-[10px] uppercase tracking-wide px-2 py-1 rounded-full bg-amber-100 text-amber-700">
                            Sponsorizzato
                        </span>
                    )}

                    {/* Menu "..." */}
                    <div className="relative" ref={menuRef}>
                        <button
                            onClick={() => setMenuOpen((o) => !o)}
                            aria-label="Altre azioni"
                            className="w-8! h-8! p-0! border-0! rounded-full! bg-transparent hover:bg-slate-100 flex items-center justify-center text-slate-500"
                        >
                            <EllipsisHorizontalIcon className="w-5 h-5" />
                        </button>

                        {menuOpen && (
                            <div className="absolute right-0 mt-1 w-52 bg-white rounded-xl shadow-lg border border-slate-100 py-1 z-30 text-slate-700">
                                {isOwnPost ? (
                                    <>
                                        {post && onUpdated && (
                                            <button onClick={() => { setMenuOpen(false); setEditing(true); }} className={menuItem}>
                                                <PencilSquareIcon className="w-4 h-4 text-slate-400" /> Modifica
                                            </button>
                                        )}
                                        <button onClick={handleShare} className={menuItem}>
                                            <ShareIcon className="w-4 h-4 text-slate-400" /> Condividi
                                        </button>
                                        <button onClick={handleDelete} className={`${menuItem} text-red-600`}>
                                            <TrashIcon className="w-4 h-4" /> Elimina
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button onClick={handleHide} className={menuItem}>
                                            <EyeSlashIcon className="w-4 h-4 text-slate-400" /> Non mi interessa
                                        </button>
                                        <button onClick={handleShare} className={menuItem}>
                                            <ShareIcon className="w-4 h-4 text-slate-400" /> Condividi
                                        </button>
                                        <button onClick={() => { setMenuOpen(false); setReporting(true); }} className={`${menuItem} text-red-600`}>
                                            <FlagIcon className="w-4 h-4" /> Segnala
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* IMAGE */}
            {imageUrl && (
                <div className="mt-3">
                    <img
                        src={imageUrl}
                        alt={title}
                        className="w-full h-40 object-cover"
                    />
                </div>
            )}

            {/* BODY */}
            <div className="p-4 flex flex-col flex-1">

                <div className="flex-1 flex flex-col gap-2">

                    <h2 className="font-semibold text-slate-900 text-sm line-clamp-1">
                        {title}
                    </h2>

                    {description && (
                        <p className="text-slate-600 text-sm line-clamp-3 min-h-[60px]">
                            {description}
                        </p>
                    )}

                    {/* Autore */}
                    <Link
                        to={authorPath}
                        className="flex items-center gap-2 mt-1 group"
                    >
                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200 shrink-0">
                            {author.profile_image ? (
                                <img
                                    src={`/storage/${author.profile_image}`}
                                    alt={`${author.first_name} avatar`}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                            )}
                        </div>

                        <span className="text-sm text-slate-900 font-medium group-hover:text-blue-600 transition-colors truncate">
                            {author.first_name} {author.last_name ?? ""}
                        </span>
                    </Link>

                    <div className="flex flex-wrap gap-1 mt-1 min-h-[24px]">
                        {tags.map((tag) => (
                            <span
                                key={tag}
                                className="px-2 py-0.5 rounded-full bg-slate-100 text-[11px] text-slate-600"
                            >
                                #{tag}
                            </span>
                        ))}
                    </div>

                    <div className="flex items-center justify-between gap-2 text-xs text-slate-600 mt-2">
                        <span className="truncate min-w-0">{contractType}</span>
                        <span className="font-semibold whitespace-nowrap">
                            {budget !== "—" && budget
                                ? `€ ${budget}${
                                      budgetType ? ` / ${budgetType}` : ""
                                  }`
                                : budget}
                        </span>
                    </div>
                </div>

                {feedback && (
                    <p className="mt-2 text-xs text-center text-green-600">{feedback}</p>
                )}

                {/* CTA */}
                {showCTA && (
                    <div className="mt-auto pt-3 flex flex-col gap-2">

                        {showCompanyCTA ? (
                            // In chat: messaggi preimpostati e sblocco, o chat libera se già sbloccato
                            <Link to={`/chat?to=${author.id}`}>
                                <button className="w-full bg-blue-600 text-white text-sm font-semibold py-1.5 rounded-lg">
                                    {isWorkerAuthor
                                        ? "Contatta il lavoratore"
                                        : "Contatta il professionista"}
                                </button>
                            </Link>
                        ) : (
                            <>
                                <button
                                    onClick={handleCandidatura}
                                    disabled={candidando}
                                    title={candidato ? "Tocca per ritirare la candidatura" : undefined}
                                    className={`w-full text-sm font-semibold py-1.5 rounded-lg disabled:opacity-60 ${
                                        candidato
                                            ? "bg-green-50 text-green-700 border! border-green-200!"
                                            : "bg-green-600 text-white"
                                    }`}
                                >
                                    {candidando ? "…" : candidato ? "✓ Candidatura inviata" : "Candidati ora"}
                                </button>
                                {erroreCandidatura && (
                                    <p className="text-[11px] text-red-500 text-center">
                                        {erroreCandidatura}{" "}
                                        {erroreCandidatura.includes("Premium") && (
                                            <Link to="/abbonamenti" className="text-blue-600 underline">Scopri Premium</Link>
                                        )}
                                    </p>
                                )}
                                <button
                                    onClick={handleShare}
                                    className="w-full border border-slate-200 text-slate-600 text-xs py-1.5 rounded-lg"
                                >
                                    Suggerisci a un amico
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>

            {editing && post && onUpdated && (
                <PostEditModal post={post} onClose={() => setEditing(false)} onSaved={onUpdated} />
            )}
            {sharing && (
                <ShareSheet postId={postId} title={title} onClose={() => setSharing(false)} />
            )}
            {reporting && (
                <ReportModal postId={postId} onClose={() => setReporting(false)} onReported={() => setHidden("reported")} />
            )}
        </article>
    );
}
