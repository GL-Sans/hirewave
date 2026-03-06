import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import axiosClient from "../api/axiosClient";
import FeedCard from "../components/FeedCard";
import type { FeedPost } from "../types/Feed";
import { useAuth } from "../context/AuthContext";
import { UserIcon } from "@heroicons/react/24/solid";

export default function ProfilePage() {
    const { id } = useParams();
    const [user, setUser] = useState<any>(null);
    const [posts, setPosts] = useState<FeedPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploadingImage, setUploadingImage] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { user: loggedUser, fetchUser } = useAuth();
    const isMyProfile = !id || Number(id) === loggedUser?.id;

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                if (id) {
                    const res = await axiosClient.get(`/api/profiles/${id}`);
                    setUser(res.data.user);
                    setPosts(res.data.posts);
                } else {
                    const res = await axiosClient.get("/api/me");
                    setUser(res.data.user);

                    const feed = await axiosClient.get("/api/feed");
                    setPosts(
                        feed.data.filter(
                            (p: any) => p.user.id === res.data.user.id,
                        ),
                    );
                }
            } catch (err) {
                console.error("Errore caricamento profilo:", err);
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [id]);

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
                <div className="h-32 md:h-48 bg-linear-to-r from-blue-500 to-indigo-600 relative">
                    {/* abstract shapes for banner */}
                    <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
                </div>

                <div className="px-6 py-4 md:px-8 md:py-6 relative">
                    <div className="flex flex-col md:flex-row items-center md:items-end -mt-20 md:-mt-24 mb-4 gap-4">
                        <div className="relative group">
                            <div className="w-28 h-28 md:w-32 md:h-32 rounded-full border-4 border-white overflow-hidden bg-gray-50 shadow-md relative flex items-center justify-center">
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
                                        onClick={() =>
                                            fileInputRef.current?.click()
                                        }
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
                            <h1 className="text-2xl font-bold text-gray-900">
                                {user.first_name} {user.last_name}
                            </h1>
                            <p className="text-sm font-medium text-blue-600 uppercase tracking-wide mt-1">
                                {user.role === "company"
                                    ? "Azienda"
                                    : user.role === "worker"
                                      ? "Lavoratore"
                                      : user.role === "pro"
                                        ? "Professionista"
                                        : user.role}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Posts / Content Area */}
            <div className="bg-slate-50 rounded-2xl p-6">
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
                                author={{
                                    id: post.user.id,
                                    first_name: post.user.first_name,
                                    last_name: post.user.last_name,
                                    role: post.user.role,
                                }}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
