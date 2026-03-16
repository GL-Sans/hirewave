import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axiosClient from "../api/axiosClient";
import FeedCard from "../components/FeedCard";
import type { FeedPost } from "../types/Feed";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";

export default function ProfilePage() {
    const { name } = useParams();
    const [user, setUser] = useState<any>(null);
    const [posts, setPosts] = useState<FeedPost[]>([]);
    const [loading, setLoading] = useState(true);
    const { user: loggedUser, logout } = useAuth();

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
                    const feed = await axiosClient.get("/api/feed");
                    setPosts(
                        feed.data.filter((p: any) => p.user.id === res.data.user.id)
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
    }, [name]);

    if (loading) return <p className="text-black p-4">Caricamento profilo…</p>;
    if (!user) return <p className="text-black p-4">Profilo non trovato</p>;

    const userSlug = `${user.first_name.toLowerCase()}-${user.last_name.toLowerCase()}`;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="text-gray-700 bg-white rounded-2xl p-4 shadow-sm flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-semibold">{user.first_name} {user.last_name}</h1>
                    <p className="text-sm pt-1 text-slate-500 capitalize">{user.role}</p>
                    <Link
                        to={`/profile/${userSlug}/curriculum`}
                        className="text-sm text-slate-500"
                    >
                        <span>CV</span>
                    </Link>
                </div>
                {isMyProfile && (
                    <button
                        onClick={logout}
                        className="text-sm text-red-600 font-semibold border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50"
                    >
                        Logout
                    </button>
                )}
            </div>

            {/* Post */}
            <h2 className="text-sm font-semibold text-gray-600 px-1 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5a2.5 2.5 0 00-2.5-2.5H15"
                    />
                </svg>
                Attività Recenti
            </h2>

            {posts.length === 0 ? (
                <div className="text-center py-10 bg-white rounded-xl border border-dashed border-gray-200 shadow-sm">
                    <svg className="mx-auto h-12 w-12 text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
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
                        />
                    ))}
                </div>
            )}
        </div>
    );
}