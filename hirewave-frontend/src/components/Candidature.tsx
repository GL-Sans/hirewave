import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axiosClient from "../api/axiosClient";
import { euro } from "../utils/labels";
import { profilePath } from "../utils/profilePath";

type Inviata = {
    id: number;
    created_at: string;
    post: { id: number; title: string; location: string | null; contract_type: string | null; budget: string | null; budget_type: string | null };
    azienda: { id: number; first_name: string; last_name: string | null } | null;
};

type Ricevuta = {
    id: number;
    created_at: string;
    post: { id: number; title: string };
    candidato: {
        id: number;
        first_name: string;
        last_name: string | null;
        role: string;
        badge: string;
        rating_tecnico: number;
        rating_reputazionale: number;
        unlocked: boolean;
        unlock_price: number;
    };
};

type Limite = { usate: number; massimo: number; restanti: number } | null;

function quando(iso: string) {
    return new Date(iso).toLocaleDateString("it-IT", { day: "numeric", month: "short" });
}

/**
 * Nel mio profilo, accanto alle attività recenti: le candidature inviate
 * (talenti) o quelle ricevute sui miei annunci (aziende).
 */
export default function Candidature({ isCompany }: { isCompany: boolean }) {
    const [inviate, setInviate] = useState<Inviata[]>([]);
    const [ricevute, setRicevute] = useState<Ricevuta[]>([]);
    const [limite, setLimite] = useState<Limite>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        axiosClient.get("/api/me/candidature")
            .then((res) => {
                setInviate(res.data.inviate ?? []);
                setRicevute(res.data.ricevute ?? []);
                setLimite(res.data.limite ?? null);
            })
            .catch((err) => console.error("Errore caricamento candidature:", err))
            .finally(() => setLoading(false));
    }, []);

    const ritira = async (c: Inviata) => {
        if (!window.confirm(`Ritirare la candidatura a «${c.post.title}»?`)) return;
        try {
            const res = await axiosClient.delete(`/api/posts/${c.post.id}/candidatura`);
            setInviate((prev) => prev.filter((x) => x.id !== c.id));
            setLimite(res.data.limite ?? null);
        } catch {
            alert("Operazione non riuscita.");
        }
    };

    const titolo = isCompany ? "Candidature ricevute" : "Candidature inviate";
    const vuote = isCompany ? ricevute.length === 0 : inviate.length === 0;

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-xl font-bold text-slate-800">{titolo}</h2>
                {limite && (
                    <span className="text-xs text-slate-500">
                        {limite.usate}/{limite.massimo} questo mese ·{" "}
                        <Link to="/abbonamenti" className="text-violet-600 hover:underline">illimitate con Premium</Link>
                    </span>
                )}
            </div>

            {loading ? (
                <div className="h-16 bg-slate-100 rounded-xl animate-pulse" />
            ) : vuote ? (
                <p className="text-sm text-slate-500">
                    {isCompany
                        ? "Nessuna candidatura per ora. Pubblica un annuncio: i talenti si candidano con un tocco."
                        : <>Nessuna candidatura. Nel <Link to="/feed" className="text-blue-600 hover:underline">feed</Link> premi «Candidati ora» su un annuncio.</>}
                </p>
            ) : isCompany ? (
                <ul className="divide-y divide-slate-100">
                    {ricevute.map((c) => (
                        <li key={c.id} className="py-3 flex items-center gap-3">
                            <div className="shrink-0 w-11 h-11 rounded-xl bg-slate-50 border border-slate-200 flex flex-col items-center justify-center">
                                <span className="text-sm font-bold text-slate-900 leading-none">{c.candidato.rating_tecnico}</span>
                                <span className="text-[9px] text-slate-400">rating</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <Link to={profilePath(c.candidato)} className="text-sm font-semibold text-slate-800 hover:underline flex items-center gap-1.5 flex-wrap">
                                    {c.candidato.first_name} {c.candidato.last_name ?? ""}
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${c.candidato.badge === "verde" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"}`}>
                                        {c.candidato.badge === "verde" ? "✓ Certificato" : "Dichiarato"}
                                    </span>
                                    {c.candidato.rating_reputazionale > 0 && (
                                        <span className="text-[11px] text-amber-600 font-semibold">★ {c.candidato.rating_reputazionale}</span>
                                    )}
                                </Link>
                                <p className="text-xs text-slate-500 truncate">{c.post.title} · {quando(c.created_at)}</p>
                            </div>
                            <Link
                                to={profilePath(c.candidato)}
                                className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg ${
                                    c.candidato.unlocked ? "bg-green-50 text-green-700 border border-green-200" : "bg-blue-600 text-white hover:bg-blue-700"
                                }`}
                            >
                                {c.candidato.unlocked ? "Sbloccato" : `Sblocca · €${euro(c.candidato.unlock_price)}`}
                            </Link>
                        </li>
                    ))}
                </ul>
            ) : (
                <ul className="divide-y divide-slate-100">
                    {inviate.map((c) => (
                        <li key={c.id} className="py-3 flex items-center gap-3">
                            <div className="flex-1 min-w-0">
                                <Link to={`/feed?post=${c.post.id}`} className="text-sm font-semibold text-slate-800 hover:underline block truncate">
                                    {c.post.title}
                                </Link>
                                <p className="text-xs text-slate-500 truncate">
                                    {c.azienda && <Link to={profilePath(c.azienda)} className="hover:underline">{c.azienda.first_name} {c.azienda.last_name ?? ""}</Link>}
                                    {c.post.location ? ` · ${c.post.location}` : ""}
                                    {c.post.budget ? ` · €${c.post.budget}${c.post.budget_type ? ` / ${c.post.budget_type}` : ""}` : ""}
                                </p>
                            </div>
                            <span className="shrink-0 text-[11px] text-green-700 bg-green-50 border border-green-100 rounded-full px-2 py-0.5">
                                Inviata il {quando(c.created_at)}
                            </span>
                            <button
                                onClick={() => ritira(c)}
                                className="shrink-0 text-xs text-slate-400 hover:text-red-600 p-0! border-0! bg-transparent"
                            >
                                Ritira
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
