import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { UserIcon } from "@heroicons/react/24/solid";
import { InformationCircleIcon } from "@heroicons/react/24/outline";
import axiosClient from "../api/axiosClient";
import FeedCard from "../components/FeedCard";
import type { FeedPost } from "../types/Feed";
import { useAuth } from "../context/AuthContext";
import { profileIdFromParam, profilePath } from "../utils/profilePath";
import { companySizeLabel, disponibilitaLabel, euro, istruzioneLabel, MERCATO, PIANI, roleLabel, unlockPrice, VERIFICA_PREMIUM_PRICE } from "../utils/labels";
import type { EsitoMercato, Piano } from "../utils/labels";
import { avviaSblocco, avvisoSblocco, messaggioErrore } from "../utils/sblocco";
import RatingBreakdown from "../components/RatingBreakdown";
import DocumentiVerifica from "../components/DocumentiVerifica";
import Candidature from "../components/Candidature";
import type { Documento, DocumentoPreset, RatingDettaglio, RatingStorico } from "../types/Rating";

// Stessa divisione del backend (RatingTecnico::certificazioniDa)
function certificazioniDa(testo?: string | null) {
    return (testo ?? "").split(/[,;\n]+/).map((s) => s.trim()).filter((s) => s.length >= 2);
}

async function scaricaFile(url: string, nome: string) {
    const response = await axiosClient.get(url, { responseType: "blob" });
    const href = window.URL.createObjectURL(new Blob([response.data]));
    // Nome scelto dal server, se lo indica (es. "CV Mario Rossi.docx")
    const dalServer = String(response.headers["content-disposition"] ?? "").match(/filename\*?=(?:UTF-8'')?"?([^";]+)/i);
    const link = document.createElement("a");
    link.href = href;
    link.setAttribute("download", dalServer ? decodeURIComponent(dalServer[1]) : nome);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(href);
}

type Review = {
    id: number;
    reviewer_id: number;
    stars: number;
    comment: string;
    created_at: string;
    reviewer?: { id: number; first_name: string };
};

const TIPI_CARICA = ["istruzione", "esperienza", "certificazione"] as const;

function Stars({ value, size = "w-4 h-4" }: { value: number; size?: string }) {
    return (
        <span className="inline-flex gap-0.5">
            {[1, 2, 3, 4, 5].map((s) => (
                <svg
                    key={s}
                    className={`${size} ${s <= Math.round(value) ? "text-yellow-400" : "text-gray-300"}`}
                    fill="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                </svg>
            ))}
        </span>
    );
}

// Riga etichetta/valore dei riquadri informativi
function Info({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex justify-between gap-4">
            <span>{label}</span>
            <span className="font-medium text-slate-700 text-right min-w-0 break-words">{children}</span>
        </div>
    );
}

// Pulsante "i" che apre/chiude un testo esplicativo
function InfoToggle({ open, onToggle, label }: { open: boolean; onToggle: () => void; label: string }) {
    return (
        <button
            type="button"
            onClick={onToggle}
            aria-expanded={open}
            aria-label={label}
            title={label}
            className={`w-6! h-6! p-0! rounded-full! border-0! inline-flex items-center justify-center transition-colors ${
                open ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500 hover:bg-blue-50 hover:text-blue-600"
            }`}
        >
            <InformationCircleIcon className="w-4 h-4" />
        </button>
    );
}

function PianoPill({ piano }: { piano?: Piano | null }) {
    if (!piano) return null;
    return piano === "boost" ? (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-700 border border-amber-200">
            ⚡ Sponsor
        </span>
    ) : (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-violet-100 text-violet-700 border border-violet-200">
            ★ Premium
        </span>
    );
}

export default function ProfilePage() {
    const { name } = useParams();
    const [user, setUser] = useState<any>(null);
    const [posts, setPosts] = useState<FeedPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [reloadKey, setReloadKey] = useState(0);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [uploadingCv, setUploadingCv] = useState(false);
    const [isEditingDescription, setIsEditingDescription] = useState(false);
    const [descriptionText, setDescriptionText] = useState("");
    const [savingDescription, setSavingDescription] = useState(false);
    const [unlocking, setUnlocking] = useState(false);
    const [reviews, setReviews] = useState<Review[]>([]);
    const [reviewStars, setReviewStars] = useState(0);
    const [reviewComment, setReviewComment] = useState("");
    const [savingReview, setSavingReview] = useState(false);
    const [reviewError, setReviewError] = useState("");
    const [ratingDettaglio, setRatingDettaglio] = useState<RatingDettaglio | null>(null);
    const [ratingStorico, setRatingStorico] = useState<RatingStorico[]>([]);
    const [uploadPreset, setUploadPreset] = useState<DocumentoPreset | null>(null);
    const [buyingPremium, setBuyingPremium] = useState(false);
    const [notice, setNotice] = useState("");
    const [unlockInfo, setUnlockInfo] = useState(false);
    const [reviewsInfo, setReviewsInfo] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cvInputRef = useRef<HTMLInputElement>(null);
    const { user: loggedUser, fetchUser, logout } = useAuth();

    const isMyProfile = !name || profileIdFromParam(name) === loggedUser?.id;

    useEffect(() => {
        const fetchProfile = async () => {
            // Ricaricando dopo uno sblocco la pagina resta visibile (niente schermata di caricamento)
            if (reloadKey === 0) setLoading(true);
            try {
                // Ritorno dal checkout Stripe: conferma il pagamento prima di caricare
                const params = new URLSearchParams(window.location.search);
                const sessionId = params.get("session_id");
                if (sessionId) {
                    try {
                        const res = await axiosClient.post("/api/stripe/confirm", { session_id: sessionId });
                        setNotice(res.data.prodotto === "verifica_premium"
                            ? "Verifica Premium attiva: ora puoi scaricare i documenti originali."
                            : "Profilo sbloccato: nome, contatti e chat sono disponibili per 30 giorni.");
                    } catch (err) {
                        console.error("Errore conferma pagamento:", err);
                    }
                } else if (params.get("verifica") === "ok") {
                    setNotice("Verifica Premium attiva (modalità demo): ora puoi scaricare i documenti originali.");
                }
                // Link del tutor: /profile?carica=istruzione apre il caricamento documento
                const carica = params.get("carica");
                if (carica && (TIPI_CARICA as readonly string[]).includes(carica)) {
                    setUploadPreset({ tipo: carica as DocumentoPreset["tipo"] });
                }
                if (sessionId || params.get("verifica") || carica) {
                    window.history.replaceState(null, "", window.location.pathname);
                }

                if (!isMyProfile) {
                    const res = await axiosClient.get(`/api/profile/${name}`);
                    setUser(res.data.user);
                    setRatingDettaglio(res.data.user.rating_dettaglio ?? null);
                    setRatingStorico([]);
                    setPosts(res.data.posts);
                    setReviews(res.data.reviews ?? []);

                    // Precompila il modulo con la mia recensione, se esiste
                    const mine = (res.data.reviews ?? []).find(
                        (r: Review) => r.reviewer_id === loggedUser?.id,
                    );
                    setReviewStars(mine?.stars ?? 0);
                    setReviewComment(mine?.comment ?? "");
                } else {
                    const res = await axiosClient.get("/api/me");
                    setUser(res.data.user);
                    setRatingDettaglio(res.data.rating_dettaglio ?? null);
                    setRatingStorico(res.data.rating_storico ?? []);

                    const [postsRes, reviewsRes] = await Promise.all([
                        axiosClient.get(`/api/profiles/${res.data.user.id}/posts`),
                        axiosClient.get(`/api/profiles/${res.data.user.id}/reviews`),
                    ]);

                    setPosts(postsRes.data);
                    setReviews(reviewsRes.data.reviews ?? []);
                    setUser((u: any) => ({ ...u, rating_reputazionale_avg: reviewsRes.data.average }));
                }
            } catch (err) {
                console.error("Errore caricamento profilo:", err);
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [name, isMyProfile, loggedUser?.id, reloadKey]);

    useEffect(() => {
        if (user) {
            setDescriptionText(user.description || "");
        }
    }, [user]);

    const handleImageChange = async (
        e: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingImage(true);
        const formData = new FormData();
        formData.append("image", file);

        try {
            const res = await axiosClient.post("/api/me/image", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            setUser((u: any) => ({ ...u, ...res.data.user }));
            await fetchUser();
        } catch (err) {
            console.error("Errore caricamento immagine:", err);
            alert("Errore durante il caricamento dell'immagine.");
        } finally {
            setUploadingImage(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleCvChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingCv(true);
        const formData = new FormData();
        formData.append("cv", file);

        try {
            const res = await axiosClient.post("/api/me/cv", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            setUser((u: any) => ({ ...u, ...res.data.user }));
            await fetchUser();
        } catch (err) {
            console.error("Errore caricamento CV:", err);
            alert("Errore durante il caricamento del CV.");
        } finally {
            setUploadingCv(false);
            if (cvInputRef.current) cvInputRef.current.value = "";
        }
    };

    const handleSaveDescription = async () => {
        if (!isMyProfile) return;
        setSavingDescription(true);
        try {
            const res = await axiosClient.put("/api/me/description", {
                description: descriptionText,
            });
            setUser((u: any) => ({ ...u, ...res.data.user }));
            await fetchUser();
            setIsEditingDescription(false);
        } catch (err) {
            console.error("Errore salvataggio descrizione:", err);
            alert("Errore durante il salvataggio della descrizione.");
        } finally {
            setSavingDescription(false);
        }
    };

    const handleUnlock = async () => {
        setUnlocking(true);
        try {
            const fatto = await avviaSblocco(user.id, "profile");
            if (fatto) {
                setNotice(avvisoSblocco(fatto, "nome, contatti, curriculum e chat disponibili per 30 giorni"));
                setReloadKey((k) => k + 1);
                if (fatto === "gratuito") fetchUser();
            }
        } catch (err) {
            alert(messaggioErrore(err));
        } finally {
            setUnlocking(false);
        }
    };

    const handleVerificaPremium = async () => {
        setBuyingPremium(true);
        try {
            const res = await axiosClient.post("/api/stripe/checkout", {
                worker_id: user.id,
                prodotto: "verifica_premium",
            });
            if (res.data.demo) {
                setNotice("Verifica Premium attiva (modalità demo): ora puoi scaricare i documenti originali.");
                setReloadKey((k) => k + 1);
            } else if (res.data.url) {
                window.location.href = res.data.url;
            }
        } catch (err: any) {
            alert(messaggioErrore(err));
        } finally {
            setBuyingPremium(false);
        }
    };

    // Dopo upload o eliminazione di un documento: rating, badge e storico aggiornati
    const handleDocumentiChanged = async (data: { user: any; rating_dettaglio: RatingDettaglio }) => {
        setUser((u: any) => ({ ...u, ...data.user }));
        setRatingDettaglio(data.rating_dettaglio);
        const res = await axiosClient.get("/api/me");
        setRatingStorico(res.data.rating_storico ?? []);
        await fetchUser();
    };

    const handleSubmitReview = async (e: React.FormEvent) => {
        e.preventDefault();
        setReviewError("");
        if (reviewStars < 1) {
            setReviewError("Seleziona da 1 a 5 stelle.");
            return;
        }
        setSavingReview(true);
        try {
            await axiosClient.post(`/api/profiles/${user.id}/reviews`, {
                stars: reviewStars,
                comment: reviewComment,
            });
            const res = await axiosClient.get(`/api/profiles/${user.id}/reviews`);
            setReviews(res.data.reviews ?? []);
            setUser((u: any) => ({
                ...u,
                rating_reputazionale: res.data.average,
                rating_reputazionale_avg: res.data.average,
                rating_reputazionale_count: res.data.count,
            }));
        } catch (err: any) {
            setReviewError(
                err?.response?.data?.message ?? "Errore durante il salvataggio della recensione.",
            );
        } finally {
            setSavingReview(false);
        }
    };

    const handleDownloadCv = async (e: React.MouseEvent) => {
        e.preventDefault();
        try {
            if (!isMyProfile) {
                // CV di un profilo sbloccato
                await scaricaFile(`/api/profiles/${user.id}/cv`, `CV ${user.first_name} ${user.last_name ?? ""}.pdf`);
                return;
            }
            const filename = user.cv ? user.cv.split("/").pop() : "cv_hirewave.pdf";
            await scaricaFile("/api/me/cv/download", filename || "cv_hirewave.pdf");
        } catch (err) {
            console.error("Errore nel download del CV:", err);
            alert("Errore durante il download del CV.");
        }
    };

    if (loading)
        return (
            <div className="max-w-5xl mx-auto">
                <div className="bg-white rounded-2xl border border-gray-100 grid md:grid-cols-[260px_1fr] animate-pulse">
                    <div className="p-6 flex flex-col items-center gap-3">
                        <div className="w-32 h-32 rounded-full bg-slate-200" />
                        <div className="h-5 w-32 bg-slate-200 rounded" />
                        <div className="h-3 w-20 bg-slate-100 rounded" />
                    </div>
                    <div className="p-6 space-y-3">
                        <div className="h-4 w-3/4 bg-slate-100 rounded" />
                        <div className="h-24 bg-slate-100 rounded-xl" />
                        <div className="h-20 bg-slate-100 rounded-xl" />
                    </div>
                </div>
            </div>
        );
    if (!user)
        return (
            <div className="p-8 text-center text-red-500 font-medium">
                Profilo non trovato
            </div>
        );

    const profileImageUrl = user.profile_image
        ? `/storage/${user.profile_image}`
        : null;
    const isTalent = user.role !== "COMPANY";
    // Media ponderata calcolata dal server: le recensioni recenti pesano di più
    const reviewAvg = Number(user.rating_reputazionale_avg ?? 0);
    const mercato = user.mercato ? MERCATO[user.mercato.esito as EsitoMercato] : null;
    const disponibilita = isTalent ? disponibilitaLabel(user) : "";
    const gratuiti = loggedUser?.sblocchi_gratuiti_rimasti ?? 0;

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
                <div className="grid md:grid-cols-[260px_minmax(0,1fr)]">
                    {/* ── Colonna sinistra: identità e azioni ── */}
                    <aside className="p-6 flex flex-col items-center text-center gap-3 border-b md:border-b-0 md:border-r border-gray-100 bg-slate-50/40">
                        <div className="group w-32 h-32 rounded-full border-4 border-white overflow-hidden bg-gray-50 shadow-md relative flex items-center justify-center">
                            {profileImageUrl ? (
                                <img
                                    src={profileImageUrl}
                                    alt={`${user.first_name} avatar`}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <UserIcon className="w-16 h-16 text-gray-300" />
                            )}
                            {isMyProfile && (
                                <div
                                    className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                    onClick={() => fileInputRef.current?.click()}
                                    title="Cambia foto"
                                >
                                    {uploadingImage ? (
                                        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    ) : (
                                        <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                    )}
                                </div>
                            )}
                        </div>
                        {isMyProfile && (
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={handleImageChange}
                            />
                        )}

                        <div className="space-y-1 max-w-full">
                            <h1 className="text-xl font-bold text-gray-900 break-words">
                                {user.first_name}
                                {user.last_name ? ` ${user.last_name}` : ""}
                            </h1>
                            <p className="text-sm text-slate-500">{roleLabel(user.role)}</p>
                        </div>

                        <div className="flex flex-wrap justify-center gap-1.5">
                            {user.badge && user.badge !== "none" && (
                                <span
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide ${
                                        user.badge === "verde"
                                            ? "bg-green-100 text-green-700 border border-green-200"
                                            : "bg-gray-100 text-gray-600 border border-gray-200"
                                    }`}
                                >
                                    <span className={`w-2 h-2 rounded-full ${user.badge === "verde" ? "bg-green-500" : "bg-gray-400"}`}></span>
                                    {user.badge === "verde" ? "Certificato" : "Dichiarato"}
                                </span>
                            )}
                            <PianoPill piano={user.piano} />
                            {user.percorso === "stagionale" && (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-sky-100 text-sky-700 border border-sky-200">
                                    ☀ Stagionale
                                </span>
                            )}
                        </div>

                        {reviews.length > 0 && (
                            <div className="flex items-center gap-1.5 text-xs text-slate-600">
                                <Stars value={reviewAvg} size="w-3.5 h-3.5" />
                                <span>{reviewAvg.toFixed(1)} · {reviews.length}</span>
                            </div>
                        )}

                        <Link
                            to={`${profilePath(user)}/curriculum`}
                            className="text-sm text-blue-600 font-medium hover:underline"
                        >
                            Curriculum
                        </Link>

                        {/* Azioni verso un altro profilo */}
                        {!isMyProfile && (
                            <div className="w-full space-y-2 pt-1">
                                {user.can_unlock && (
                                    <>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={handleUnlock}
                                                disabled={unlocking}
                                                className="flex-1 px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50"
                                            >
                                                {unlocking
                                                    ? "Sblocco in corso…"
                                                    : gratuiti > 0
                                                        ? `Sblocca gratis · ${gratuiti} ${gratuiti === 1 ? "rimasto" : "rimasti"}`
                                                        : `Sblocca · €${user.unlock_price ? euro(user.unlock_price) : unlockPrice(user.badge)}`}
                                            </button>
                                            <InfoToggle open={unlockInfo} onToggle={() => setUnlockInfo((o) => !o)} label="Cosa ottieni sbloccando" />
                                        </div>
                                        {unlockInfo && (
                                            <p className="text-[11px] text-slate-500 text-left">
                                                Nome, email, telefono, istituto e anno del titolo, curriculum completo
                                                {user.curriculum_sbloccabile && !user.curriculum_public ? " (anche se reso privato)" : ""}
                                                , CV se caricato e chat libera per 30 giorni.{" "}
                                                {user.badge === "verde" ? "Dati verificati con documenti." : "Dati dichiarati, non ancora verificati."}
                                            </p>
                                        )}
                                    </>
                                )}
                                {user.has_cv && (
                                    <button
                                        onClick={handleDownloadCv}
                                        className="w-full px-4 py-2 bg-indigo-50 border border-indigo-100 text-indigo-700 text-sm font-medium rounded-xl hover:bg-indigo-100"
                                    >
                                        Scarica CV
                                    </button>
                                )}
                                {user.can_contact && (
                                    <Link
                                        to={`/chat?to=${user.id}`}
                                        className="flex justify-center w-full px-4 py-2.5 bg-slate-900 text-white text-sm font-medium rounded-xl hover:bg-slate-700"
                                    >
                                        {user.chat_libera ? "Scrivi un messaggio" : "Invia un messaggio rapido"}
                                    </Link>
                                )}
                            </div>
                        )}

                        {/* Azioni sul mio profilo */}
                        {isMyProfile && (
                            <div className="w-full space-y-2 pt-1">
                                {user.cv && (
                                    <button
                                        onClick={handleDownloadCv}
                                        className="w-full px-4 py-2 bg-indigo-50 border border-indigo-100 text-indigo-700 text-sm font-medium rounded-xl hover:bg-indigo-100"
                                    >
                                        Scarica CV
                                    </button>
                                )}
                                <button
                                    onClick={() => cvInputRef.current?.click()}
                                    disabled={uploadingCv}
                                    className="w-full px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 disabled:opacity-50"
                                >
                                    {uploadingCv ? "Caricamento..." : user.cv ? "Aggiorna CV" : "Carica CV"}
                                </button>
                                <input
                                    type="file"
                                    ref={cvInputRef}
                                    className="hidden"
                                    accept=".pdf,.doc,.docx"
                                    onChange={handleCvChange}
                                />
                                {isTalent && (
                                    <Link
                                        to="/abbonamenti"
                                        className={`flex justify-center w-full px-4 py-2 text-sm font-semibold rounded-xl border ${
                                            user.piano
                                                ? "bg-white border-violet-200 text-violet-700 hover:bg-violet-50"
                                                : "bg-gradient-to-r from-violet-600 to-blue-600 text-white border-transparent hover:opacity-90"
                                        }`}
                                    >
                                        {user.piano ? `Piano ${PIANI[user.piano as Piano].nome}` : "Passa a Premium"}
                                    </Link>
                                )}
                                <button
                                    onClick={logout}
                                    className="w-full text-sm text-red-600 font-semibold border border-red-200 px-4 py-2 rounded-xl hover:bg-red-50"
                                >
                                    Logout
                                </button>
                            </div>
                        )}
                    </aside>

                    {/* ── Colonna destra: informazioni ── */}
                    <section className="p-6 md:p-8 space-y-4 min-w-0">
                        {notice && (
                            <p className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-xl px-3 py-2">{notice}</p>
                        )}

                        {/* Descrizione: nello stesso riquadro degli altri dati */}
                        {(isEditingDescription || user.description || isMyProfile) && (
                        <div className="border border-slate-200 rounded-xl p-4">
                        <span className="text-sm font-semibold text-slate-700 block mb-2">Descrizione</span>
                        {isEditingDescription ? (
                            <div>
                                <textarea
                                    className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                                    rows={4}
                                    value={descriptionText}
                                    onChange={(e) => setDescriptionText(e.target.value)}
                                    placeholder="Aggiungi una descrizione..."
                                    disabled={savingDescription}
                                />
                                <div className="mt-2 flex gap-2">
                                    <button
                                        onClick={handleSaveDescription}
                                        disabled={savingDescription}
                                        className="px-3 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded hover:bg-indigo-700 disabled:opacity-50"
                                    >
                                        {savingDescription ? "Salvataggio..." : "Salva"}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setIsEditingDescription(false);
                                            setDescriptionText(user.description || "");
                                        }}
                                        disabled={savingDescription}
                                        className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm font-medium rounded hover:bg-gray-200 disabled:opacity-50"
                                    >
                                        Annulla
                                    </button>
                                </div>
                            </div>
                        ) : user.description ? (
                            <p
                                className={`text-sm text-gray-700 whitespace-pre-wrap ${isMyProfile ? "cursor-pointer hover:bg-slate-50 rounded-lg -m-1 p-1" : ""}`}
                                onClick={() => isMyProfile && setIsEditingDescription(true)}
                                title={isMyProfile ? "Modifica la descrizione" : undefined}
                            >
                                {user.description}
                            </p>
                        ) : (
                            isMyProfile && (
                                <button
                                    onClick={() => setIsEditingDescription(true)}
                                    className="p-0! border-0! bg-transparent text-sm text-indigo-600 font-medium hover:text-indigo-800"
                                >
                                    + Aggiungi una descrizione
                                </button>
                            )
                        )}
                        </div>
                        )}

                        <div className={`grid gap-4 ${isTalent && ratingDettaglio ? "lg:grid-cols-2" : ""}`}>
                            {/* Dati aziendali pubblici */}
                            {!isTalent && (user.settore || user.dimensione_azienda || user.anni_attivita != null || user.anni_esperienza != null) && (
                                <div className="border border-slate-200 rounded-xl p-4 space-y-1.5 text-xs text-slate-500">
                                    <span className="text-sm font-semibold text-slate-700 block mb-2">Azienda</span>
                                    {user.settore && <Info label="Settore">{user.settore}</Info>}
                                    {user.dimensione_azienda && <Info label="Dimensione">{companySizeLabel(user.dimensione_azienda)}</Info>}
                                    {(user.anni_attivita ?? user.anni_esperienza) != null && (
                                        <Info label="Attiva da">{user.anni_attivita ?? user.anni_esperienza} anni</Info>
                                    )}
                                </div>
                            )}

                            {/* Dati di valutazione visibili prima dello sblocco (business plan, par. 5.1) */}
                            {isTalent && (user.settore || user.livello_istruzione || user.ral_aspettativa || disponibilita) && (
                                <div className="border border-slate-200 rounded-xl p-4 space-y-1.5 text-xs text-slate-500">
                                    <span className="text-sm font-semibold text-slate-700 block mb-2">Profilo professionale</span>
                                    {user.settore && <Info label="Settore">{user.settore}</Info>}
                                    {user.livello_istruzione && (
                                        <Info label="Titolo di studio">
                                            {istruzioneLabel(user.livello_istruzione)}
                                            {/* Istituto e anno: solo dopo lo sblocco */}
                                            {(user.istituto || user.anno_titolo) && (
                                                <span className="block font-normal text-slate-500">
                                                    {[user.istituto, user.anno_titolo].filter(Boolean).join(", ")}
                                                </span>
                                            )}
                                        </Info>
                                    )}
                                    {user.ral_aspettativa && (
                                        <Info label="Retribuzione attesa">
                                            {user.ral_aspettativa}
                                            {mercato && (
                                                <span
                                                    className={`ml-1.5 inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${mercato.classi}`}
                                                    title={`Media degli annunci (${user.mercato.settore}): €${user.mercato.media}/mese`}
                                                >
                                                    {mercato.label}
                                                </span>
                                            )}
                                        </Info>
                                    )}
                                    {disponibilita && <Info label="Disponibilità">{disponibilita}</Info>}
                                    {user.zona && <Info label="Zona">{user.zona}</Info>}
                                </div>
                            )}

                            {isTalent && ratingDettaglio && (
                                <RatingBreakdown
                                    dettaglio={ratingDettaglio}
                                    storico={isMyProfile ? ratingStorico : undefined}
                                    curriculumPath={isMyProfile ? `${profilePath(user)}/curriculum` : undefined}
                                    onUpload={isMyProfile ? setUploadPreset : undefined}
                                />
                            )}
                        </div>

                        {/* Contatti, visibili solo dopo lo sblocco */}
                        {!isMyProfile && (user.email || user.phone) && (
                            <div className="border border-slate-200 rounded-xl p-4 space-y-1.5 text-xs text-slate-500">
                                <span className="text-sm font-semibold text-slate-700 block mb-2">Contatti</span>
                                {user.email && (
                                    <Info label="Email">
                                        <a href={`mailto:${user.email}`} className="text-blue-600 hover:underline break-all">{user.email}</a>
                                    </Info>
                                )}
                                {user.phone && (
                                    <Info label="Telefono">
                                        <a href={`tel:${user.phone}`} className="text-blue-600 hover:underline">{user.phone}</a>
                                    </Info>
                                )}
                                {user.city && <Info label="Città">{user.city}</Info>}
                                {user.unlock_expires_at && (
                                    <p className="text-[11px] text-slate-400 pt-1">
                                        Profilo sbloccato fino al {new Date(user.unlock_expires_at).toLocaleDateString("it-IT")}
                                    </p>
                                )}
                            </div>
                        )}

                        {user.verifica_premium_disponibile && (
                            <div className="border border-green-200 bg-green-50 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-green-700">Verifica Premium</p>
                                    <p className="text-xs text-slate-600 mt-0.5">
                                        Scarica i documenti originali che hanno certificato questo profilo.
                                    </p>
                                </div>
                                <button
                                    onClick={handleVerificaPremium}
                                    disabled={buyingPremium}
                                    className="px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 border-0!"
                                >
                                    {buyingPremium ? "Attivazione…" : `Acquista · €${VERIFICA_PREMIUM_PRICE}`}
                                </button>
                            </div>
                        )}

                        {!isMyProfile && user.verifica_premium && user.documenti?.length > 0 && (
                            <div className="border border-slate-200 rounded-xl p-4">
                                <span className="text-sm font-semibold text-slate-700 block mb-2">Documenti verificati</span>
                                <ul className="space-y-1.5">
                                    {user.documenti.map((d: Documento) => (
                                        <li key={d.id} className="flex items-center justify-between gap-2 text-sm">
                                            <span className="text-slate-700 min-w-0 break-words">
                                                {d.descrizione}
                                                {d.anno ? ` · ${d.anno}` : ""}
                                            </span>
                                            <button
                                                onClick={() => scaricaFile(`/api/documenti/${d.id}/file`, d.nome_file).catch(() => alert("Download non riuscito."))}
                                                className="shrink-0 text-xs text-blue-600 p-0! border-0! bg-transparent hover:underline"
                                            >
                                                Scarica
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {isMyProfile && isTalent && user.onboarding_completato && (
                            <DocumentiVerifica
                                livelloIstruzione={user.livello_istruzione}
                                certificazioni={certificazioniDa(user.certificazioni)}
                                preset={uploadPreset}
                                onPresetUsed={() => setUploadPreset(null)}
                                onChanged={handleDocumentiChanged}
                            />
                        )}
                    </section>
                </div>
            </div>

            {/* Recensioni */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        Recensioni
                        <InfoToggle open={reviewsInfo} onToggle={() => setReviewsInfo((o) => !o)} label="Chi può recensire" />
                    </h2>
                    {reviews.length > 0 && (
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Stars value={reviewAvg} />
                            <span>
                                {reviewAvg.toFixed(1)} · {reviews.length}{" "}
                                {reviews.length === 1 ? "recensione" : "recensioni"}
                            </span>
                        </div>
                    )}
                </div>
                {reviewsInfo && (
                    <p className="text-xs text-slate-400 -mt-2">
                        Solo da aziende e professionisti che hanno sbloccato il profilo. Media ponderata: le recensioni dell'ultimo anno pesano di più.
                    </p>
                )}

                {reviews.length === 0 ? (
                    <p className="text-sm text-slate-500">Nessuna recensione per ora.</p>
                ) : (
                    <ul className="space-y-3">
                        {reviews.map((r) => (
                            <li key={r.id} className="border border-slate-100 rounded-xl p-3">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                                        {r.reviewer?.first_name ?? "Utente"}
                                        <span className="text-[10px] font-semibold text-green-700 bg-green-50 border border-green-100 rounded-full px-1.5 py-0.5">
                                            ✓ verificata
                                        </span>
                                    </span>
                                    <Stars value={r.stars} size="w-3.5 h-3.5" />
                                </div>
                                <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">{r.comment}</p>
                                <p className="text-[11px] text-slate-400 mt-1">
                                    {new Date(r.created_at).toLocaleDateString("it-IT")}
                                </p>
                            </li>
                        ))}
                    </ul>
                )}

                {!isMyProfile && !user.can_review && user.can_unlock && (
                    <p className="text-sm text-slate-500 border-t border-slate-100 pt-4">
                        Sblocca il profilo per lavorare con {user.first_name} e lasciare una recensione.
                    </p>
                )}

                {!isMyProfile && user.can_review && (
                    <form onSubmit={handleSubmitReview} className="border-t border-slate-100 pt-4 space-y-3">
                        <p className="text-sm font-semibold text-slate-700">
                            {reviews.some((r) => r.reviewer_id === loggedUser?.id)
                                ? "Modifica la tua recensione"
                                : "Lascia una recensione"}
                        </p>
                        <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((s) => (
                                <button
                                    key={s}
                                    type="button"
                                    onClick={() => setReviewStars(s)}
                                    aria-label={`${s} stelle`}
                                    className="p-0! border-0! bg-transparent"
                                >
                                    <svg
                                        className={`w-7 h-7 ${s <= reviewStars ? "text-yellow-400" : "text-gray-300"}`}
                                        fill="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                                    </svg>
                                </button>
                            ))}
                        </div>
                        <textarea
                            className="w-full border border-gray-300 rounded-lg p-2 text-sm text-gray-800 focus:ring-indigo-500 focus:border-indigo-500"
                            rows={3}
                            minLength={10}
                            maxLength={1000}
                            required
                            value={reviewComment}
                            onChange={(e) => setReviewComment(e.target.value)}
                            placeholder="Racconta com'è andata (almeno 10 caratteri)"
                        />
                        {reviewError && <p className="text-xs text-red-500">{reviewError}</p>}
                        <button
                            type="submit"
                            disabled={savingReview}
                            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                        >
                            {savingReview ? "Salvataggio..." : "Pubblica recensione"}
                        </button>
                    </form>
                )}
            </div>

            {/* Candidature inviate (talenti) o ricevute (aziende), accanto alle attività */}
            {isMyProfile && <Candidature isCompany={!isTalent} />}

            {/* Posts / Content Area */}
            <div className="bg-slate-50 rounded-2xl">
                <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5a2.5 2.5 0 00-2.5-2.5H15" />
                    </svg>
                    Attività Recenti
                </h2>

                {posts.length === 0 ? (
                    <div className="text-center py-10 bg-white rounded-xl border border-dashed border-gray-200 shadow-sm">
                        <svg className="mx-auto h-12 w-12 text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <h3 className="text-sm font-medium text-gray-900">Nessun post</h3>
                        <p className="mt-1 text-sm text-gray-500">Non ci sono post pubblicati in questo profilo.</p>
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 gap-5">
                        {posts.map((post) => (
                            <FeedCard
                                key={post.id}
                                postId={post.id}
                                type={post.type}
                                title={post.title}
                                description={post.description}
                                location={post.location ?? "—"}
                                timeAgo="—"
                                sponsored={post.sponsored}
                                imageUrl={post.image ? `/storage/${post.image}` : undefined}
                                tags={post.type === "job" ? ["Annuncio"] : ["Richiesta"]}
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
                                onUpdated={(updated) =>
                                    setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
                                }
                                onDeleted={(id) => setPosts((prev) => prev.filter((p) => p.id !== id))}
                                onRemoved={(id) => setPosts((prev) => prev.filter((p) => p.id !== id))}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
