import { useEffect, useState } from "react";
<<<<<<< HEAD
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
=======
import SearchBar from "../components/SearchBar";
>>>>>>> dev_stefano
import axiosClient from "../api/axiosClient";
// import JobCard from "../components/JobCard";
import type { FeedPost } from "../types/Feed";
import FeedCard from "../components/FeedCard";

export default function FeedPage() {
<<<<<<< HEAD
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axiosClient
      .get("/api/feed")
      .then((res) => setPosts(res.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-sm text-slate-500">Caricamento feed…</p>;
  }

  return (
    <div className="space-y-4">
      {/* Filtri rapidi */}
      <div className="flex flex-wrap gap-2">
        <button className="px-3 py-1.5 rounded-full bg-slate-900 text-white text-xs font-semibold">
          Solo Passaparola
        </button>
        <button className="px-3 py-1.5 rounded-full border border-slate-300 text-xs text-slate-700">
          Filtri avanzati
        </button>
      </div>

      {/* Search */}
      <div className="flex-1">
        <div className="text-gray-600 border border-gray-300 flex items-center gap-2 bg-slate-100 rounded-full px-3 py-1.5">
          <MagnifyingGlassIcon className="w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Cerca opportunità…"
            className="bg-transparent outline-none text-sm flex-1"
          />
        </div>
      </div>

      {/* Lista annunci */}
      <div className="grid md:grid-cols-2 gap-4">
        {posts.map((post) => (
          <FeedCard
            key={post.id}
            postId={post.id}
            type={post.type}
            title={post.title}
            location={post.location ?? "—"}
            timeAgo={formatTimeAgo(post.created_at)}
            sponsored={post.sponsored}
            imageUrl={getImageByType(post.type)}
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
    </div>
  );
}

/* Helpers UI (semplici e sostituibili) */
function getImageByType(type: "job" | "service") {
  return type === "job"
    ? "https://images.pexels.com/photos/1181671/pexels-photo-1181671.jpeg?auto=compress&cs=tinysrgb&w=800"
    : "https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=800";
}

function formatTimeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor(diff / (1000 * 60));
  if (hours < 1) return `${minutes} minuti fa`;
  if (hours < 24) return `${hours} ore fa`;
  const days = Math.floor(hours / 24);
  return `${days} giorni fa`;
=======
    const [posts, setPosts] = useState<FeedPost[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        axiosClient
            .get("/api/feed")
            .then((res) => setPosts(res.data))
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return <p className="text-sm text-slate-500">Caricamento feed…</p>;
    }

    return (
        <div className="space-y-4">
            {/* Filtri rapidi */}
            <div className="flex flex-wrap gap-2">
                <button className="px-3 py-1.5 rounded-full bg-slate-900 text-white text-xs font-semibold">
                    Solo Passaparola
                </button>
                <button className="px-3 py-1.5 rounded-full border border-slate-300 text-xs text-slate-700">
                    Filtri avanzati
                </button>
            </div>

            {/* Search */}
            <SearchBar placeholder="Cerca opportunità…" />

            {/* Lista annunci */}
            <div className="grid md:grid-cols-2 gap-4">
                {posts.map((post) => (
                    <FeedCard
                        key={post.id}
                        postId={post.id}
                        type={post.type}
                        title={post.title}
                        location={post.location ?? "—"}
                        timeAgo={formatTimeAgo(post.created_at)}
                        sponsored={post.sponsored}
                        imageUrl={
                            post.image ? `/storage/${post.image}` : undefined
                        }
                        tags={
                            post.type === "job" ? ["Annuncio"] : ["Richiesta"]
                        }
                        contractType={post.contract_type ?? "—"}
                        budget={post.budget ?? "—"}
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
        </div>
    );
}

/* Helpers UI (semplici e sostituibili) */
function formatTimeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));
    if (hours < 1) return `${minutes} minuti fa`;
    if (hours < 24) return `${hours} ore fa`;
    const days = Math.floor(hours / 24);
    return `${days} giorni fa`;
>>>>>>> dev_stefano
}
