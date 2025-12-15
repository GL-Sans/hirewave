import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axiosClient from "../api/axiosClient";
import FeedCard from "../components/FeedCard";
import type { FeedPost } from "../types/Feed";
import { useAuth } from "../context/AuthContext";

export default function ProfilePage() {
  const { id } = useParams();
  const [user, setUser] = useState<any>(null);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const { user: loggedUser, logout } = useAuth();
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
  }, [id]);

  if (loading) return <p className="text-black p-4">Caricamento profilo…</p>;
  if (!user) return <p className="text-black p-4">Profilo non trovato</p>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-gray-700 bg-white rounded-2xl p-4 shadow-sm flex items-center justify-between">
      <div>
        <h1 className="text-xl font-semibold">{user.name}</h1>
        <p className="text-sm text-slate-500 capitalize">{user.role}</p>
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
      {posts.length === 0 ? (
        <p className="text-sm text-slate-500">
          Nessun post pubblicato
        </p>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {posts.map((post) => (
            <FeedCard
              key={post.id}
              postId={post.id}
              type={post.type}
              title={post.title}
              location={post.location ?? "—"}
              timeAgo="—"
              sponsored={post.sponsored}
              imageUrl="https://images.pexels.com/photos/1181671/pexels-photo-1181671.jpeg"
              tags={post.type === "job" ? ["Annuncio"] : ["Richiesta"]}
              contractType={post.contract_type ?? "—"}
              budget={post.budget ?? "—"}
              author={{
                id: post.user.id,
                name: post.user.name,
                role: post.user.role,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
