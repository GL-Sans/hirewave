import {
    BookmarkIcon,
    PaperAirplaneIcon,
    UserPlusIcon,
} from "@heroicons/react/24/solid";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";

type TalentCardProps = {
    id: number;
    firstName: string;
    lastName?: string | null;
    role: string;
    imageUrl?: string;
    skills?: string[];
    badge?: string;
    unlocked?: boolean;
};

function formatRole(role: string) {
    if (role === "PRO") return "Pro";
    if (role === "WORKER") return "Lavoratore";
    return role;
}

export default function TalentCard(props: TalentCardProps) {
    const { id, firstName, lastName, role, imageUrl, skills = [], badge, unlocked } = props;
    const navigate = useNavigate();
    const { user } = useAuth();
    const isCompany = user?.role === "COMPANY";
    const [loading, setLoading] = useState(false);

    // Se il cognome è nascosto (profilo non sbloccato) uso l'id
    const profilePath = lastName
        ? `/profile/${firstName.toLowerCase()}-${lastName.toLowerCase()}`
        : `/profile/${id}`;

    const handleUnlock = async (e: React.MouseEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch("/api/stripe/checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Accept": "application/json" },
                credentials: "include",
                body: JSON.stringify({ worker_id: id }),
            });
            const data = await res.json();
            if (data.url) window.location.href = data.url;
        } catch (err) {
            console.error("Errore checkout:", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Link
            to={profilePath}
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

            {badge && badge !== "none" && (
                <div className="absolute top-3 left-3 z-10">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                        badge === "verde"
                            ? "bg-green-500 text-white"
                            : "bg-black/50 text-white"
                    }`}>
                        {badge === "verde" ? "✓ Certificato" : "Dichiarato"}
                    </span>
                </div>
            )}

            <div className="absolute top-3 right-3 flex flex-col gap-2">
                <button
                    className="w-8! h-8! p-0! rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition"
                    onClick={(e) => e.preventDefault()}
                >
                    <BookmarkIcon className="w-5 h-5" />
                </button>
                <button
                    className="w-8! h-8! p-0! rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition"
                    onClick={(e) => { e.preventDefault(); navigate("/chat"); }}
                >
                    <PaperAirplaneIcon className="w-5 h-5 -rotate-45 -mt-0.5 ml-0.5" />
                </button>
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
                <div className="flex items-end justify-between">
                    <div className="flex-1 pr-2">
                        <h2 className={`text-sm font-bold tracking-tight leading-tight mb-0.5 truncate ${imageUrl ? "text-white" : "text-slate-800"}`}>
                            {firstName ?? "—"} {lastName ?? ""}
                        </h2>
                        <p className={`text-[11px] font-medium mb-2 capitalize ${imageUrl ? "text-slate-300" : "text-slate-500"}`}>
                            {formatRole(role)}
                        </p>
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
                    {isCompany && (
                        <button
                            className={`w-10! h-10! p-0! shrink-0 rounded-full flex items-center justify-center text-white shadow-xl transition transform hover:scale-105 active:scale-95 disabled:opacity-50 ${
                                unlocked ? "bg-green-500 hover:bg-green-400" : "bg-blue-600 hover:bg-blue-500"
                            }`}
                            onClick={unlocked ? (e) => e.preventDefault() : handleUnlock}
                            disabled={loading || unlocked}
                            title={unlocked ? "Profilo sbloccato" : "Sblocca profilo"}
                        >
                            {loading
                                ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                : unlocked
                                    ? <span className="text-sm">✓</span>
                                    : <UserPlusIcon className="w-4 h-4" />
                            }
                        </button>
                    )}
                </div>
            </div>
        </Link>
    );
}