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
    "w-8! h-8! p-0! border-0! rounded-full bg-white/90 shadow-sm flex items-center justify-center text-slate-600 hover:bg-white hover:text-blue-600 transition";

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
    const iniziali = `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase();

    // Riquadro foto in alto, contenuto sotto in colonna: niente elementi
    // sovrapposti anche sui telefoni stretti (prima era tutto in posizione assoluta)
    return (
        <Link
            to={talentPath}
            className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow overflow-hidden"
        >
            <div className="relative h-28 sm:h-32 shrink-0 bg-gradient-to-br from-slate-100 to-slate-200">
                {imageUrl ? (
                    <img
                        src={imageUrl}
                        alt={`${firstName ?? ""} ${lastName ?? ""}`}
                        loading="lazy"
                        className="w-full h-full object-cover"
                    />
                ) : (
                    // Iniziali in basso: in alto ci sono badge e pulsanti
                    <div className="w-full h-full flex items-end justify-center pb-2.5">
                        <span className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/80 text-slate-400 font-bold text-base sm:text-lg flex items-center justify-center">
                            {iniziali || "?"}
                        </span>
                    </div>
                )}

                <div className="absolute top-2 left-2 right-11 flex flex-col items-start gap-1">
                    {/* Il badge riguarda i dati dei talenti, non le aziende */}
                    {!isCompanyCard && badge && badge !== "none" && (
                        <span className={`text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full whitespace-nowrap ${
                            badge === "verde" ? "bg-green-500 text-white" : "bg-slate-700/70 text-white"
                        }`}>
                            {badge === "verde" ? "✓ Certificato" : "Dichiarato"}
                        </span>
                    )}
                    {piano === "boost" && (
                        <span className="text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full whitespace-nowrap bg-amber-400 text-amber-950">⚡ Sponsor</span>
                    )}
                    {piano === "premium" && (
                        <span className="text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full whitespace-nowrap bg-violet-500 text-white">★ In evidenza</span>
                    )}
                </div>

                <div className="absolute top-2 right-2 flex flex-col gap-1.5">
                    <button
                        className={iconButton}
                        onClick={handleSave}
                        aria-label={saved ? "Rimuovi dai salvati" : "Salva"}
                        title={saved ? "Rimuovi dai salvati" : "Salva"}
                    >
                        <SaveIcon className="w-4 h-4" />
                    </button>
                    {canChat && (
                        <button
                            className={iconButton}
                            // Se non è sbloccato, la chat propone lo sblocco senza cambiare pagina
                            onClick={(e) => { e.preventDefault(); navigate(`/chat?to=${id}`); }}
                            aria-label="Scrivi un messaggio"
                            title="Scrivi un messaggio"
                        >
                            <PaperAirplaneIcon className="w-4 h-4 -rotate-45 -mt-0.5 ml-0.5" />
                        </button>
                    )}
                </div>
            </div>

            <div className="flex flex-col flex-1 gap-1.5 p-3">
                <div className="min-w-0">
                    <h2 className="text-sm font-bold text-slate-800 leading-tight truncate">
                        {firstName ?? "—"} {lastName ?? ""}
                    </h2>
                    <p className="text-[11px] text-slate-500 leading-snug line-clamp-2">
                        {formatRole(role)}
                        {istruzione ? ` · ${istruzione}` : ""}
                    </p>
                </div>

                {rating != null && rating > 0 && (
                    <div className="flex items-center gap-1.5" title="Rating tecnico su 100">
                        <span className="text-[11px] font-bold text-slate-800 w-5">{rating}</span>
                        <div className="h-1.5 flex-1 rounded-full overflow-hidden bg-slate-100">
                            <div className={`h-full ${badge === "verde" ? "bg-green-500" : "bg-blue-500"}`} style={{ width: `${rating}%` }} />
                        </div>
                    </div>
                )}

                {skills.length > 0 && (
                    <span className="self-start max-w-full truncate px-2 py-0.5 text-[9px] uppercase font-bold rounded-full tracking-wide text-slate-600 bg-slate-100">
                        {skills[0]}
                    </span>
                )}

                {showUnlock && (
                    <button
                        className={`mt-auto w-full py-2! px-2! rounded-xl! border-0! text-xs font-semibold text-white transition active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-1.5 ${
                            unlocked ? "bg-green-500" : "bg-blue-600 hover:bg-blue-500"
                        }`}
                        onClick={unlocked ? (e) => e.preventDefault() : handleUnlock}
                        disabled={loading || unlocked}
                    >
                        {loading
                            ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            : unlocked
                                ? <><CheckIcon className="w-3.5 h-3.5" /> Sbloccato</>
                                : <><UserPlusIcon className="w-3.5 h-3.5" /> Sblocca{unlockPrice ? ` · €${euro(unlockPrice)}` : ""}</>
                        }
                    </button>
                )}
                {showFollow && (
                    <button
                        className={`mt-auto w-full py-2! px-2! rounded-xl! text-xs font-semibold transition active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-1.5 ${
                            followed ? "bg-white text-green-700 border! border-green-200!" : "bg-blue-600 text-white border-0! hover:bg-blue-500"
                        }`}
                        onClick={handleFollow}
                        disabled={loading}
                        title={followed ? "Smetti di seguire" : "Segui: ricevi i nuovi annunci"}
                    >
                        {loading
                            ? <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            : followed
                                ? <><CheckIcon className="w-3.5 h-3.5" /> Seguita</>
                                : <><UserPlusIcon className="w-3.5 h-3.5" /> Segui</>
                        }
                    </button>
                )}
            </div>
        </Link>
    );
}

