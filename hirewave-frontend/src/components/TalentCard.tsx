import {
    BookmarkIcon as BookmarkSolidIcon,
    CheckIcon,
    PaperAirplaneIcon,
    UserPlusIcon,
} from "@heroicons/react/24/solid";
import { BookmarkIcon } from "@heroicons/react/24/outline";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import axiosClient from "../api/axiosClient";
import { profilePath } from "../utils/profilePath";
import { euro } from "../utils/labels";
import { avviaSblocco, messaggioErrore } from "../utils/sblocco";

// Card unica per le pagine Talenti e Aziende
type TalentCardProps = {
    id: number;
    firstName: string;
    lastName?: string | null;
    role: string;
    imageUrl?: string;
    skills?: string[];
    badge?: string;
    unlocked?: boolean;
    saved?: boolean;
    followed?: boolean;
    // Visibili prima dello sblocco (business plan, par. 5.1)
    rating?: number | null;
    istruzione?: string;
    // Sblocco possibile per chi guarda (azienda, o professionista su un lavoratore)
    canUnlock?: boolean;
    unlockPrice?: number;
    piano?: "premium" | "boost" | null;
    onSavedChange?: (id: number, saved: boolean) => void;
    onUnlocked?: (id: number) => void;
};

function formatRole(role: string) {
    if (role === "PRO") return "Professionista";
    if (role === "WORKER") return "Lavoratore";
    if (role === "COMPANY") return "Azienda";
    return role;
}

const iconButton =
    "w-8! h-8! p-0! border-0! rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition";

export default function TalentCard(props: TalentCardProps) {
    const { id, firstName, lastName, role, imageUrl, skills = [], badge, unlocked, rating, istruzione, canUnlock, unlockPrice, piano, onSavedChange, onUnlocked } = props;
    const navigate = useNavigate();
    const { user } = useAuth();
    const isCompanyViewer = user?.role === "COMPANY";
    const isCompanyCard = role === "COMPANY";
    const [loading, setLoading] = useState(false);
    const [saved, setSaved] = useState(!!props.saved);
    const [followed, setFollowed] = useState(!!props.followed);

    // Se il cognome è nascosto (profilo non sbloccato) uso l'id
    const talentPath = profilePath({ id, first_name: firstName, last_name: lastName });

    // Stesse regole della chat: le aziende scrivono ai talenti sbloccati, non ad altre aziende
    const canChat = isCompanyViewer ? !isCompanyCard : true;
    const showUnlock = !!canUnlock;
    const showFollow = !isCompanyViewer && isCompanyCard;

    const handleUnlock = async (e: React.MouseEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (await avviaSblocco(id, "talents")) onUnlocked?.(id);
        } catch (err: any) {
            alert(messaggioErrore(err));
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.MouseEvent) => {
        e.preventDefault();
        setSaved((s) => !s); // aggiornamento immediato, poi conferma dal server
        try {
            const res = await axiosClient.post(`/api/saved/${id}`);
            setSaved(res.data.saved);
            onSavedChange?.(id, res.data.saved);
        } catch {
            setSaved((s) => !s);
        }
    };

    const handleFollow = async (e: React.MouseEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await axiosClient.post(`/api/follow/${id}`);
            setFollowed(res.data.followed);
        } catch (err: any) {
            alert(err?.response?.data?.message ?? "Operazione non riuscita.");
        } finally {
            setLoading(false);
        }
    };

    const SaveIcon = saved ? BookmarkSolidIcon : BookmarkIcon;

    return (
        <Link
            to={talentPath}
            className="block relative rounded-[20px] group aspect-square border border-slate-200 shadow-md overflow-hidden"
        >
            {imageUrl ? (
                <img
                    src={imageUrl}
                    alt={`${firstName ?? ""} ${lastName ?? ""}`}
                    loading="lazy"
                    className="w-full h-full object-cover"
                />
            ) : (
                <div className="w-full h-full bg-slate-100" />
            )}

            {/* Overlay solo se c'è immagine */}
            {imageUrl && (
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
            )}

            <div className="absolute top-3 left-3 z-10 flex flex-col items-start gap-1">
                {badge && badge !== "none" && (
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                        badge === "verde"
                            ? "bg-green-500 text-white"
                            : "bg-black/50 text-white"
                    }`}>
                        {badge === "verde" ? "✓ Certificato" : "Dichiarato"}
                    </span>
                )}
                {piano === "boost" && (
                    <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-amber-400 text-amber-950">⚡ Sponsor</span>
                )}
                {piano === "premium" && (
                    <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-violet-500 text-white">★ In evidenza</span>
                )}
            </div>

            <div className="absolute top-3 right-3 flex flex-col gap-2 z-10">
                <button
                    className={iconButton}
                    onClick={handleSave}
                    aria-label={saved ? "Rimuovi dai salvati" : "Salva"}
                    title={saved ? "Rimuovi dai salvati" : "Salva"}
                >
                    <SaveIcon className="w-5 h-5" />
                </button>
                {canChat && (
                    <button
                        className={iconButton}
                        // Se non è sbloccato, la chat propone lo sblocco senza cambiare pagina
                        onClick={(e) => { e.preventDefault(); navigate(`/chat?to=${id}`); }}
                        aria-label="Scrivi un messaggio"
                        title="Scrivi un messaggio"
                    >
                        <PaperAirplaneIcon className="w-5 h-5 -rotate-45 -mt-0.5 ml-0.5" />
                    </button>
                )}
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
                <div className="flex items-end justify-between">
                    <div className="flex-1 min-w-0 pr-2">
                        <h2 className={`text-sm font-bold tracking-tight leading-tight mb-0.5 truncate ${imageUrl ? "text-white" : "text-slate-800"}`}>
                            {firstName ?? "—"} {lastName ?? ""}
                        </h2>
                        <p className={`text-[11px] font-medium mb-2 ${imageUrl ? "text-slate-300" : "text-slate-500"}`}>
                            {formatRole(role)}
                            {istruzione ? ` · ${istruzione}` : ""}
                        </p>
                        {rating != null && rating > 0 && (
                            <div className="flex items-center gap-1.5 mb-2" title="Rating tecnico su 100">
                                <span className={`text-[10px] font-bold ${imageUrl ? "text-white" : "text-slate-800"}`}>
                                    {rating}
                                </span>
                                <div className={`h-1 w-14 rounded-full overflow-hidden ${imageUrl ? "bg-white/30" : "bg-slate-200"}`}>
                                    <div className={`h-full ${badge === "verde" ? "bg-green-500" : "bg-blue-500"}`} style={{ width: `${rating}%` }} />
                                </div>
                            </div>
                        )}
                        <div className="flex flex-wrap gap-1">
                            {skills.slice(0, 1).map((skill, index) => (
                                <span
                                    key={index}
                                    className={`px-2 py-1 text-[8px] uppercase font-bold rounded-full tracking-wider ${imageUrl ? "text-white bg-black/40" : "text-slate-700 bg-slate-200"}`}
                                >
                                    {skill}
                                </span>
                            ))}
                        </div>
                    </div>
                    {showUnlock && (
                        <button
                            className={`w-10! h-10! p-0! border-0! shrink-0 rounded-full flex items-center justify-center text-white shadow-xl transition transform hover:scale-105 active:scale-95 disabled:opacity-50 ${
                                unlocked ? "bg-green-500 hover:bg-green-400" : "bg-blue-600 hover:bg-blue-500"
                            }`}
                            onClick={unlocked ? (e) => e.preventDefault() : handleUnlock}
                            disabled={loading || unlocked}
                            title={unlocked ? "Profilo sbloccato" : `Sblocca profilo · €${unlockPrice ? euro(unlockPrice) : ""}`}
                        >
                            {loading
                                ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                : unlocked
                                    ? <span className="text-sm">✓</span>
                                    : <UserPlusIcon className="w-4 h-4" />
                            }
                        </button>
                    )}
                    {showFollow && (
                        <button
                            className={`w-10! h-10! p-0! border-0! shrink-0 rounded-full flex items-center justify-center text-white shadow-xl transition transform hover:scale-105 active:scale-95 disabled:opacity-50 ${
                                followed ? "bg-green-500 hover:bg-green-400" : "bg-blue-600 hover:bg-blue-500"
                            }`}
                            onClick={handleFollow}
                            disabled={loading}
                            title={followed ? "Smetti di seguire" : "Segui: ricevi i nuovi annunci"}
                            aria-label={followed ? "Smetti di seguire" : "Segui azienda"}
                        >
                            {loading
                                ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                : followed
                                    ? <CheckIcon className="w-4 h-4" />
                                    : <UserPlusIcon className="w-4 h-4" />
                            }
                        </button>
                    )}
                </div>
            </div>
        </Link>
    );
}
