import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { UserIcon } from "@heroicons/react/24/solid";
import axiosClient from "../api/axiosClient";
import FeedCard from "../components/FeedCard";
import type { FeedPost } from "../types/Feed";
import { useAuth } from "../context/AuthContext";

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
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cvInputRef = useRef<HTMLInputElement>(null);
    const { user: loggedUser, fetchUser, logout } = useAuth();

    const loggedUserSlug = loggedUser
        ? `${loggedUser.first_name.toLowerCase()}-${loggedUser.last_name.toLowerCase()}`
        : null;

    const isMyProfile = !name || name === loggedUserSlug;

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                if (name && name !== loggedUserSlug) {
                    const res = await axiosClient.get(`/api/profile/${name}`);
                    setUser(res.data.user);
                    setPosts(res.data.posts);
                } else {
                    const res = await axiosClient.get("/api/me");
                    setUser(res.data.user);

                    const postsRes = await axiosClient.get(
                        `/api/profiles/${res.data.user.id}/posts`
                    );

                    setPosts(postsRes.data);
                }
            } catch (err) {
                console.error("Errore caricamento profilo:", err);
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [name]);

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

    const userSlug = user.last_name
        ? `${user.first_name.toLowerCase()}-${user.last_name.toLowerCase()}`
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
                            <h1 className="text-2xl font-bold text-gray-900">
                                {user.first_name}
                                {user.last_name ? ` ${user.last_name}` : ""}
                            </h1>
                            <p className="text-sm text-slate-500 capitalize">
                                {user.role}
                            </p>
                            <Link
                                to={`/profile/${userSlug ?? user.id}/curriculum`}
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
                            {user.rating_tecnico > 0 && (
                                <div className="mt-3 border border-slate-200 rounded-xl p-4 max-w-sm">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-semibold text-slate-700">
                                            Rating Tecnico
                                        </span>
                                        <span className="text-lg font-bold text-slate-900">
                                            {user.rating_tecnico}
                                            <span className="text-sm text-slate-400 font-normal">
                                                /100
                                            </span>
                                        </span>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-1.5 mb-3">
                                        <div
                                            className="bg-slate-800 h-1.5 rounded-full transition-all"
                                            style={{
                                                width: `${user.rating_tecnico}%`,
                                            }}
                                        ></div>
                                    </div>
                                    <div className="space-y-1.5 text-xs text-slate-500">
                                        {user.livello_istruzione && (
                                            <div className="flex justify-between">
                                                <span>Istruzione</span>
                                                <span className="font-medium text-slate-700 capitalize">
                                                    {user.livello_istruzione.replace(
                                                        "_",
                                                        " ",
                                                    )}
                                                </span>
                                            </div>
                                        )}
                                        {user.anni_esperienza != null && (
                                            <div className="flex justify-between">
                                                <span>Esperienza</span>
                                                <span className="font-medium text-slate-700">
                                                    {user.anni_esperienza} anni
                                                </span>
                                            </div>
                                        )}
                                        {user.settore && (
                                            <div className="flex justify-between">
                                                <span>Settore</span>
                                                <span className="font-medium text-slate-700">
                                                    {user.settore}
                                                </span>
                                            </div>
                                        )}
                                        {user.certificazioni && (
                                            <div className="flex justify-between">
                                                <span>Certificazioni</span>
                                                <span className="font-medium text-slate-700">
                                                    {user.certificazioni}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    {isMyProfile && (
                                        <p className="text-[10px] text-slate-400 mt-3">
                                            Aggiungi certificazioni o esperienza
                                            per aumentare il rating.
                                        </p>
                                    )}
                                </div>
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
                    </div>
                </div>
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
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}