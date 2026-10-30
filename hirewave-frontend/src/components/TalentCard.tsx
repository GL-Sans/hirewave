import {
    BookmarkIcon as BookmarkSolidIcon,
    CheckIcon,
    PaperAirplaneIcon,
    UserPlusIcon,
} from "@heroicons/react/24/solid";
import { BookmarkIcon, InformationCircleIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import axiosClient from "../api/axiosClient";
import { profilePath } from "../utils/profilePath";
import { euro, MERCATO } from "../utils/labels";
import type { EsitoMercato } from "../utils/labels";
import { avviaSblocco, messaggioErrore } from "../utils/sblocco";
import { useBackClose } from "../hooks/useBackClose";

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
    stelle?: number | null;
    recensioni?: number;
    ral?: string | null;
    mercato?: EsitoMercato | null;
    disponibilita?: string;
    stagionale?: boolean;
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

const pill = "text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full whitespace-nowrap";

// Riga etichetta/valore del pannello informazioni
function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <dt className="text-[10px] uppercase tracking-wide text-slate-400">{label}</dt>
            <dd className="text-xs text-slate-700 leading-snug break-words">{children}</dd>
        </div>
    );
}

export default function TalentCard(props: TalentCardProps) {
    const { id, firstName, lastName, role, imageUrl, skills = [], badge, unlocked, rating, istruzione, stelle, recensioni = 0, ral, mercato, disponibilita, stagionale, canUnlock, unlockPrice, piano, onSavedChange, onUnlocked } = props;
    const navigate = useNavigate();
    const { user, fetchUser } = useAuth();
    const isCompanyViewer = user?.role === "COMPANY";
    const isCompanyCard = role === "COMPANY";
    const [loading, setLoading] = useState(false);
    const [saved, setSaved] = useState(!!props.saved);
    const [followed, setFollowed] = useState(!!props.followed);
    const [infoOpen, setInfoOpen] = useState(false);
    useBackClose(infoOpen, () => setInfoOpen(false));

    // Se il cognome è nascosto (profilo non sbloccato) uso l'id
    const talentPath = profilePath({ id, first_name: firstName, last_name: lastName });

    // Stesse regole della chat (App\Support\Chat): niente chat tra pari, cioè tra utenti dello stesso ruolo
    const canChat = !!user && user.role !== role;
    const showUnlock = !!canUnlock;
    const showFollow = !isCompanyViewer && isCompanyCard;

    const gratuiti = user?.sblocchi_gratuiti_rimasti ?? 0;

    const handleUnlock = async (e: React.MouseEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const fatto = await avviaSblocco(id, "talents");
            if (fatto === "gratuito") fetchUser();
            if (fatto) onUnlocked?.(id);
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

    const toggleInfo = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setInfoOpen((o) => !o);
    };

    const SaveIcon = saved ? BookmarkSolidIcon : BookmarkIcon;
    const iniziali = `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase();

    // Sulla foto un solo badge: la visibilità pagata, altrimenti la certificazione
    const badgeFoto =
        piano === "boost" ? <span className={`${pill} bg-amber-400 text-amber-950`}>⚡ Sponsor</span>
        : piano === "premium" ? <span className={`${pill} bg-violet-500 text-white`}>★ In evidenza</span>
        : !isCompanyCard && badge === "verde" ? <span className={`${pill} bg-green-500 text-white`}>✓ Certificato</span>
        : null;

    // Il resto dei dati si apre col pulsante info, per tenere la card pulita
    const hasInfo = !isCompanyCard || !!istruzione || !!ral || !!disponibilita || skills.length > 0;

    // Riquadro foto in alto, contenuto sotto in colonna: niente elementi
    // sovrapposti anche sui telefoni stretti (prima era tutto in posizione assoluta)
    return (
        <Link
            to={talentPath}
            className="relative flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow overflow-hidden"
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

                {badgeFoto && <div className="absolute top-2 left-2 right-11 flex">{badgeFoto}</div>}

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

            <div className="flex flex-col flex-1 gap-2 p-3">
                <div className="flex items-start gap-1">
                    <div className="min-w-0 flex-1">
                        <h2 className="text-sm font-bold text-slate-800 leading-tight truncate">
                            {firstName ?? "—"} {lastName ?? ""}
                        </h2>
                        <p className="text-[11px] text-slate-500 leading-snug truncate">{formatRole(role)}</p>
                    </div>
                    {hasInfo && (
                        <button
                            type="button"
                            onClick={toggleInfo}
                            aria-expanded={infoOpen}
                            aria-label="Informazioni"
                            title="Informazioni"
                            className="shrink-0 w-7! h-7! p-0! border-0! rounded-full! bg-transparent flex items-center justify-center text-slate-400 hover:bg-blue-50 hover:text-blue-600"
                        >
                            <InformationCircleIcon className="w-5 h-5" />
                        </button>
                    )}
                </div>

                {rating != null && rating > 0 && (
                    <div className="flex items-center gap-1.5" title="Rating tecnico su 100">
                        <span className="text-[11px] font-bold text-slate-800 w-5">{rating}</span>
                        <div className="h-1.5 flex-1 rounded-full overflow-hidden bg-slate-100">
                            <div className={`h-full ${badge === "verde" ? "bg-green-500" : "bg-blue-500"}`} style={{ width: `${rating}%` }} />
                        </div>
                    </div>
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
                                : gratuiti > 0
                                    ? <><UserPlusIcon className="w-3.5 h-3.5" /> Sblocca gratis</>
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

            {/* Pannello informazioni: copre la card, i clic non aprono il profilo */}
            {infoOpen && (
                <div
                    className="absolute inset-0 z-10 bg-white flex flex-col p-3 cursor-default"
                    onClick={(e) => e.preventDefault()}
                >
                    <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-xs font-bold text-slate-800">Informazioni</span>
                        <button
                            type="button"
                            onClick={toggleInfo}
                            aria-label="Chiudi informazioni"
                            className="w-7! h-7! p-0! border-0! rounded-full! bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
                        >
                            <XMarkIcon className="w-4 h-4" />
                        </button>
                    </div>

                    <dl className="flex-1 overflow-y-auto space-y-2">
                        {!isCompanyCard && (
                            <InfoRow label="Dati">
                                {badge === "verde" ? "✓ Certificati con documenti" : "Dichiarati, non ancora verificati"}
                            </InfoRow>
                        )}
                        {/* Rating reputazionale: stelle e numero di recensioni verificate */}
                        {!isCompanyCard && (
                            <InfoRow label="Recensioni">
                                {recensioni > 0 && stelle
                                    ? <><span className="text-amber-500">★</span> {stelle.toFixed(1)} · {recensioni} {recensioni === 1 ? "recensione" : "recensioni"}</>
                                    : "Nessuna recensione"}
                            </InfoRow>
                        )}
                        {istruzione && <InfoRow label="Istruzione">{istruzione}</InfoRow>}
                        {ral && (
                            <InfoRow label="Retribuzione attesa">
                                {ral}
                                {mercato && (
                                    <span className={`ml-1 inline-block px-1.5 py-px rounded-full border text-[10px] font-semibold whitespace-nowrap ${MERCATO[mercato].classi}`}>
                                        {MERCATO[mercato].label}
                                    </span>
                                )}
                            </InfoRow>
                        )}
                        {(disponibilita || stagionale) && (
                            <InfoRow label="Disponibilità">{[disponibilita, stagionale && "☀ stagionale"].filter(Boolean).join(" · ")}</InfoRow>
                        )}
                        {skills.length > 0 && <InfoRow label="Competenze">{skills.join(", ").toLowerCase()}</InfoRow>}
                    </dl>

                    <button
                        type="button"
                        // Sostituisce il passo del pannello: "indietro" dal profilo torna all'elenco
                        onClick={(e) => { e.preventDefault(); navigate(talentPath, { replace: true }); }}
                        className="mt-2 w-full py-1.5! px-2! rounded-xl! border! border-slate-200! bg-white text-xs font-semibold text-blue-600 hover:bg-blue-50"
                    >
                        Apri il profilo
                    </button>
                </div>
            )}
        </Link>
    );
}

