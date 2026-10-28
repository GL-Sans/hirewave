import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { UserIcon } from "@heroicons/react/24/solid";
import axiosClient from "../api/axiosClient";
import FeedCard from "../components/FeedCard";
import type { FeedPost } from "../types/Feed";
import { useAuth } from "../context/AuthContext";
import { profileIdFromParam, profilePath } from "../utils/profilePath";
import { companySizeLabel, istruzioneLabel, roleLabel, unlockPrice, VERIFICA_PREMIUM_PRICE } from "../utils/labels";
import RatingBreakdown from "../components/RatingBreakdown";
import DocumentiVerifica from "../components/DocumentiVerifica";
import type { Documento, DocumentoPreset, RatingDettaglio, RatingStorico } from "../types/Rating";

// Stessa divisione del backend (RatingTecnico::certificazioniDa)
function certificazioniDa(testo?: string | null) {
    return (testo ?? "").split(/[,;\n]+/).map((s) => s.trim()).filter((s) => s.length >= 2);
}

async function scaricaFile(url: string, nome: string) {
    const response = await axiosClient.get(url, { responseType: "blob" });
    const href = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = href;
    link.setAttribute("download", nome);
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

export default function ProfilePage() {
    const { name } = useParams();
    const [user, setUser] = useState<any>(null);
    const [posts, setPosts] = useState<FeedPost[]>([]);
    const [loading, setLoading] = useState(true);
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
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cvInputRef = useRef<HTMLInputElement>(null);
    const { user: loggedUser, fetchUser, logout } = useAuth();

    const isMyProfile = !name || profileIdFromParam(name) === loggedUser?.id;

    useEffect(() => {
        const fetchProfile = async () => {
            setLoading(true);
            try {
                // Ritorno dal checkout (Verifica Premium): conferma il pagamento prima di caricare
                const params = new URLSearchParams(window.location.search);
                const sessionId = params.get("session_id");
                if (sessionId) {
                    try {
                        await axiosClient.post("/api/stripe/confirm", { session_id: sessionId });
                        setNotice("Verifica Premium attiva: ora puoi scaricare i documenti originali.");
                    } catch (err) {
                        console.error("Errore conferma pagamento:", err);
                    }
                } else if (params.get("verifica") === "ok") {
                    setNotice("Verifica Premium attiva (modalità demo): ora puoi scaricare i documenti originali.");
                }
                if (sessionId || params.get("verifica")) {
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
                }
            } catch (err) {
                console.error("Errore caricamento profilo:", err);
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [name, isMyProfile, loggedUser?.id]);

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
            setUser(res.data.user);
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
            setUser(res.data.user);
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
            setUser(res.data.user);
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
            const res = await axiosClient.post("/api/stripe/checkout", {
                worker_id: user.id,
            });
            if (res.data.url) window.location.href = res.data.url;
        } catch (err) {
            console.error("Errore checkout:", err);
            alert("Errore durante l'avvio del pagamento.");
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
            if (res.data.url) window.location.href = res.data.url;
        } catch (err: any) {
            alert(err?.response?.data?.message ?? "Errore durante l'avvio del pagamento.");
            setBuyingPremium(false);
        }
    };

    // Dopo upload o eliminazione di un documento: rating, badge e storico aggiornati
    const handleDocumentiChanged = async (data: { user: any; rating_dettaglio: RatingDettaglio }) => {
        setUser(data.user);
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
            const response = await axiosClient.get("/api/me/cv/download", {
                responseType: "blob",
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement("a");
            link.href = url;

            // Extract filename from user.cv if possible, else generic
            const filename = user.cv ? user.cv.split("/").pop() : "cv_hirewave.pdf";
            link.setAttribute("download", filename || "cv_hirewave.pdf");

            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Errore nel download del CV:", err);
            alert("Errore durante il download del CV.");
        }
    };

    if (loading)
        return (
            <div className="p-8 text-center text-gray-500 animate-pulse">
                Caricamento profilo…
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

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header / Cover Area */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
                <div className="px-6 py-4 md:px-8 md:py-6">
                    {isMyProfile && (
                        <div className="flex justify-end mb-2">
                            <button
                                onClick={logout}
                                className="text-sm text-red-600 font-semibold border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50"
                            >
                                Logout
                            </button>
                        </div>
                    )}

                    <div className="flex flex-col md:flex-row items-center md:items-end mb-4 gap-4">
                        <div className="group w-28 h-28 md:w-32 md:h-32 rounded-full border-4 border-white overflow-hidden bg-gray-50 shadow-md relative flex items-center justify-center">
                            {profileImageUrl ? (
                                <img
                                    src={profileImageUrl}
                                    alt={`${user.first_name} avatar`}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <UserIcon className="w-16 h-16 text-gray-300" />
                            )}
                            {user.rating_reputazionale > 0 && (
                                <div className="absolute bottom-0 left-0 right-0 bg-black/50 py-1 flex justify-center gap-0.5">
                                    {[1, 2, 3, 4, 5].map((s) => (
                                        <svg
                                            key={s}
                                            className={`w-3 h-3 ${s <= Math.round(user.rating_reputazionale) ? "text-yellow-400" : "text-gray-400"}`}
                                            fill="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                                        </svg>
                                    ))}
                                </div>
                            )}
                            {isMyProfile && (
                                <div
                                    className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    {uploadingImage ? (
                                        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    ) : (
                                        <svg
                                            className="w-8 h-8 text-white"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                                            />
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                                            />
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
                    </div>

                    <div className="text-center md:text-left flex-1 pb-2">
                        <div className="flex flex-col items-center md:items-start gap-2">
                            <h1 className="text-2xl font-bold text-gray-900 break-words max-w-full">
                                {user.first_name}
                                {user.last_name ? ` ${user.last_name}` : ""}
                            </h1>
                            <p className="text-sm text-slate-500">
                                {roleLabel(user.role)}
                            </p>
                            <Link
                                to={`${profilePath(user)}/curriculum`}
                                className="text-sm text-blue-600 font-medium hover:underline"
                            >
                                Curriculum
                            </Link>
                            {user.badge && user.badge !== "none" && (
                                <span
                                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wide ${
                                        user.badge === "verde"
                                            ? "bg-green-100 text-green-700 border border-green-200"
                                            : "bg-gray-100 text-gray-600 border border-gray-200"
                                    }`}
                                >
                                    <span
                                        className={`w-2 h-2 rounded-full ${user.badge === "verde" ? "bg-green-500" : "bg-gray-400"}`}
                                    ></span>
                                    {user.badge === "verde"
                                        ? "Certificato"
                                        : "Dichiarato"}
                                </span>
                            )}
                            {user.role === "COMPANY" &&
                                (user.settore || user.dimensione_azienda || user.anni_attivita != null || user.anni_esperienza != null) && (
                                <div className="mt-3 border border-slate-200 rounded-xl p-4 max-w-sm w-full space-y-1.5 text-xs text-slate-500">
                                    <span className="text-sm font-semibold text-slate-700 block mb-2">
                                        Azienda
                                    </span>
                                    {user.settore && (
                                        <div className="flex justify-between gap-4">
                                            <span>Settore</span>
                                            <span className="font-medium text-slate-700 text-right min-w-0 break-words">{user.settore}</span>
                                        </div>
                                    )}
                                    {user.dimensione_azienda && (
                                        <div className="flex justify-between gap-4">
                                            <span>Dimensione</span>
                                            <span className="font-medium text-slate-700 text-right min-w-0 break-words">{companySizeLabel(user.dimensione_azienda)}</span>
                                        </div>
                                    )}
                                    {(user.anni_attivita ?? user.anni_esperienza) != null && (
                                        <div className="flex justify-between gap-4">
                                            <span>Attiva da</span>
                                            <span className="font-medium text-slate-700 text-right min-w-0 break-words">{user.anni_attivita ?? user.anni_esperienza} anni</span>
                                        </div>
                                    )}
                                </div>
                            )}
                            {/* Dati di valutazione visibili prima dello sblocco (business plan, par. 5.1) */}
                            {user.role !== "COMPANY" && (user.settore || user.livello_istruzione || user.ral_aspettativa) && (
                                <div className="mt-3 border border-slate-200 rounded-xl p-4 max-w-md w-full space-y-1.5 text-xs text-slate-500">
                                    <span className="text-sm font-semibold text-slate-700 block mb-2">
                                        Profilo professionale
                                    </span>
                                    {user.settore && (
                                        <div className="flex justify-between gap-4">
                                            <span>Settore</span>
                                            <span className="font-medium text-slate-700 text-right min-w-0 break-words">{user.settore}</span>
                                        </div>
                                    )}
                                    {user.livello_istruzione && (
                                        <div className="flex justify-between gap-4">
                                            <span>Titolo di studio</span>
                                            <span className="font-medium text-slate-700 text-right">{istruzioneLabel(user.livello_istruzione)}</span>
                                        </div>
                                    )}
                                    {user.ral_aspettativa && (
                                        <div className="flex justify-between gap-4">
                                            <span>Retribuzione attesa</span>
                                            <span className="font-medium text-slate-700 text-right min-w-0 break-words">{user.ral_aspettativa}</span>
                                        </div>
                                    )}
                                </div>
                            )}
                            {user.role !== "COMPANY" && ratingDettaglio && (
                                <RatingBreakdown
                                    dettaglio={ratingDettaglio}
                                    storico={isMyProfile ? ratingStorico : undefined}
                                    curriculumPath={isMyProfile ? `${profilePath(user)}/curriculum` : undefined}
                                    onUpload={isMyProfile ? setUploadPreset : undefined}
                                />
                            )}
                        </div>

                        {/* Description Section */}
                        {isEditingDescription ? (
                            <div className="mt-3 max-w-2xl mx-auto md:mx-0 text-left">
                                <textarea
                                    className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                                    rows={4}
                                    value={descriptionText}
                                    onChange={(e) =>
                                        setDescriptionText(e.target.value)
                                    }
                                    placeholder="Aggiungi una descrizione..."
                                    disabled={savingDescription}
                                />
                                <div className="mt-2 flex gap-2 justify-center md:justify-start">
                                    <button
                                        onClick={handleSaveDescription}
                                        disabled={savingDescription}
                                        className="px-3 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded hover:bg-indigo-700 disabled:opacity-50"
                                    >
                                        {savingDescription
                                            ? "Salvataggio..."
                                            : "Salva"}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setIsEditingDescription(false);
                                            setDescriptionText(
                                                user.description || "",
                                            );
                                        }}
                                        disabled={savingDescription}
                                        className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm font-medium rounded hover:bg-gray-200 disabled:opacity-50"
                                    >
                                        Annulla
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div
                                className="mt-3 max-w-2xl group cursor-pointer"
                                onClick={() =>
                                    isMyProfile && setIsEditingDescription(true)
                                }
                            >
                                {user.description ? (
                                    <p className="text-sm text-gray-700 whitespace-pre-wrap relative inline-block text-center md:text-left">
                                        {user.description}
                                        {isMyProfile && (
                                            <span className="ml-2 inline-flex opacity-0 group-hover:opacity-100 transition-opacity align-middle">
                                                <svg
                                                    className="w-4 h-4 text-gray-400"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                                                    />
                                                </svg>
                                            </span>
                                        )}
                                    </p>
                                ) : (
                                    isMyProfile && (
                                        <button className="text-sm text-indigo-600 font-medium hover:text-indigo-800 flex items-center justify-center md:justify-start mx-auto md:mx-0">
                                            <svg
                                                className="w-4 h-4 mr-1"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M12 4v16m8-8H4"
                                                />
                                            </svg>
                                            Aggiungi una descrizione
                                        </button>
                                    )
                                )}
                            </div>
                        )}

                        {/* Contatti / Sblocco */}
                        {!isMyProfile && (
                            <div className="mt-5 border-t border-gray-100 pt-5">
                                {user.email || user.phone ? (
                                    <div className="space-y-1 text-sm text-gray-700">
                                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                            Contatti
                                        </h3>
                                        {user.email && (
                                            <p>
                                                Email:{" "}
                                                <a
                                                    href={`mailto:${user.email}`}
                                                    className="text-blue-600 hover:underline break-all"
                                                >
                                                    {user.email}
                                                </a>
                                            </p>
                                        )}
                                        {user.phone && (
                                            <p>
                                                Telefono:{" "}
                                                <a
                                                    href={`tel:${user.phone}`}
                                                    className="text-blue-600 hover:underline"
                                                >
                                                    {user.phone}
                                                </a>
                                            </p>
                                        )}
                                        {user.city && <p>Città: {user.city}</p>}
                                        {user.unlock_expires_at && (
                                            <p className="text-xs text-slate-400 pt-1">
                                                Profilo sbloccato fino al{" "}
                                                {new Date(user.unlock_expires_at).toLocaleDateString("it-IT")}
                                            </p>
                                        )}
                                    </div>
                                ) : (
                                    loggedUser?.role === "COMPANY" &&
                                    user.role !== "COMPANY" &&
                                    !user.unlocked && (
                                        <button
                                            onClick={handleUnlock}
                                            disabled={unlocking}
                                            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                        >
                                            {unlocking
                                                ? "Reindirizzamento..."
                                                : `Sblocca profilo e contatti · €${unlockPrice(user.badge)}`}
                                        </button>
                                    )
                                )}
                                {loggedUser?.role === "COMPANY" && user.role !== "COMPANY" && !user.unlocked && (
                                    <p className="text-xs text-slate-400 mt-2">
                                        Nome, contatti e chat libera per 30 giorni.{" "}
                                        {user.badge === "verde"
                                            ? "Profilo certificato: dati verificati con documenti."
                                            : "Profilo dichiarato: dati non ancora verificati."}
                                    </p>
                                )}

                                {notice && <p className="mt-3 text-sm text-green-700">{notice}</p>}

                                {user.verifica_premium_disponibile && (
                                    <div className="mt-4 border border-green-200 bg-green-100 rounded-xl p-3">
                                        <p className="text-sm font-semibold text-green-700">Verifica Premium</p>
                                        <p className="text-xs text-slate-600 mt-0.5">
                                            Scarica i documenti originali che hanno certificato questo profilo (titoli, attestati, referenze).
                                        </p>
                                        <button
                                            onClick={handleVerificaPremium}
                                            disabled={buyingPremium}
                                            className="mt-2 px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 border-0!"
                                        >
                                            {buyingPremium ? "Reindirizzamento..." : `Acquista · €${VERIFICA_PREMIUM_PRICE}`}
                                        </button>
                                    </div>
                                )}

                                {user.verifica_premium && user.documenti?.length > 0 && (
                                    <div className="mt-4">
                                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                            Documenti verificati
                                        </h3>
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
                                {user.can_contact && (
                                    <Link
                                        to={`/chat?to=${user.id}`}
                                        className="mt-3 inline-flex px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-700"
                                    >
                                        Scrivi un messaggio
                                    </Link>
                                )}
                            </div>
                        )}

                        {/* CV Section */}
                        {isMyProfile && (
                            <div className="mt-5 flex flex-wrap gap-3 justify-center md:justify-start border-t border-gray-100 pt-5">
                                {user.cv && (
                                    <button
                                        onClick={handleDownloadCv}
                                        className="inline-flex items-center px-4 py-2 bg-indigo-50 border border-indigo-100 text-indigo-700 text-sm font-medium rounded-lg hover:bg-indigo-100 transition-colors cursor-pointer"
                                    >
                                        <svg
                                            className="w-4 h-4 mr-2"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                            />
                                        </svg>
                                        Scarica CV
                                    </button>
                                )}

                                <>
                                    <button
                                        onClick={() => cvInputRef.current?.click()}
                                        disabled={uploadingCv}
                                        className="inline-flex items-center px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                                    >
                                        <svg
                                            className="w-4 h-4 mr-2 text-gray-500"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                                            />
                                        </svg>
                                        {uploadingCv
                                            ? "Caricamento..."
                                            : user.cv
                                              ? "Aggiorna CV"
                                              : "Carica CV"}
                                    </button>
                                    <input
                                        type="file"
                                        ref={cvInputRef}
                                        className="hidden"
                                        accept=".pdf,.doc,.docx"
                                        onChange={handleCvChange}
                                    />
                                </>
                            </div>
                        )}

                        {isMyProfile && user.role !== "COMPANY" && user.onboarding_completato && (
                            <DocumentiVerifica
                                livelloIstruzione={user.livello_istruzione}
                                certificazioni={certificazioniDa(user.certificazioni)}
                                preset={uploadPreset}
                                onPresetUsed={() => setUploadPreset(null)}
                                onChanged={handleDocumentiChanged}
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* Recensioni */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-xl font-bold text-slate-800">Recensioni</h2>
                    {reviews.length > 0 && (
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Stars value={reviews.reduce((s, r) => s + r.stars, 0) / reviews.length} />
                            <span>
                                {(reviews.reduce((s, r) => s + r.stars, 0) / reviews.length).toFixed(1)} · {reviews.length}{" "}
                                {reviews.length === 1 ? "recensione" : "recensioni"}
                            </span>
                        </div>
                    )}
                </div>

                {reviews.length === 0 ? (
                    <p className="text-sm text-slate-500">Nessuna recensione per ora.</p>
                ) : (
                    <ul className="space-y-3">
                        {reviews.map((r) => (
                            <li key={r.id} className="border border-slate-100 rounded-xl p-3">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-sm font-semibold text-slate-800">
                                        {r.reviewer?.first_name ?? "Utente"}
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

            {/* Posts / Content Area */}
            <div className="bg-slate-50 rounded-2xl">
                <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <svg
                        className="w-5 h-5 text-indigo-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5a2.5 2.5 0 00-2.5-2.5H15"
                        />
                    </svg>
                    Attività Recenti
                </h2>

                {posts.length === 0 ? (
                    <div className="text-center py-10 bg-white rounded-xl border border-dashed border-gray-200 shadow-sm">
                        <svg
                            className="mx-auto h-12 w-12 text-gray-300 mb-3"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                        </svg>
                        <h3 className="text-sm font-medium text-gray-900">
                            Nessun post
                        </h3>
                        <p className="mt-1 text-sm text-gray-500">
                            Non ci sono post pubblicati in questo profilo.
                        </p>
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