import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import axiosClient from "../api/axiosClient";
import { useAuth } from "../context/AuthContext";
import { istruzioneLabel, roleLabel } from "../utils/labels";
import type { Documento } from "../types/Rating";

type DocumentoAdmin = Documento & {
    user: {
        id: number;
        first_name: string;
        last_name: string;
        role: string;
        livello_istruzione: string | null;
        anni_esperienza: number | null;
        birth_date: string | null;
        certificazioni: string | null;
    };
};

const FILTRI = [
    { value: "revisione_manuale", label: "Da revisionare" },
    { value: "verificato", label: "Verificati" },
    { value: "rifiutato", label: "Rifiutati" },
];

// Revisione manuale dei casi ambigui segnalati dalla verifica automatica
export default function AdminDocumentiPage() {
    const { user } = useAuth();
    const [stato, setStato] = useState("revisione_manuale");
    const [documenti, setDocumenti] = useState<DocumentoAdmin[]>([]);
    const [loading, setLoading] = useState(true);
    const [note, setNote] = useState<Record<number, string>>({});
    const [busy, setBusy] = useState<number | null>(null);

    const load = async () => {
        setLoading(true);
        try {
            const res = await axiosClient.get("/api/admin/documenti", { params: { stato } });
            setDocumenti(res.data);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user?.is_admin) load();
    }, [stato, user?.is_admin]);

    if (!user?.is_admin) return <Navigate to="/feed" replace />;

    const decidi = async (d: DocumentoAdmin, approvato: boolean) => {
        setBusy(d.id);
        try {
            await axiosClient.post(`/api/admin/documenti/${d.id}/esito`, { approvato, nota: note[d.id] ?? "" });
            setDocumenti((prev) => prev.filter((x) => x.id !== d.id));
        } catch (err: any) {
            alert(err?.response?.data?.message ?? "Operazione non riuscita.");
        } finally {
            setBusy(null);
        }
    };

    const scarica = async (d: DocumentoAdmin) => {
        const res = await axiosClient.get(`/api/documenti/${d.id}/file`, { responseType: "blob" });
        window.open(window.URL.createObjectURL(new Blob([res.data], { type: String(res.headers["content-type"] ?? "") })), "_blank");
    };

    return (
        <div className="space-y-4">
            <div className="bg-white rounded-2xl p-4 shadow-sm">
                <h1 className="text-xl font-semibold text-slate-800">Revisione documenti</h1>
                <p className="text-sm text-slate-500 mt-1">
                    Casi che la verifica automatica non ha potuto decidere: confronta il documento con i dati del profilo.
                </p>
                <div className="flex gap-2 mt-3 overflow-x-auto">
                    {FILTRI.map((f) => (
                        <button
                            key={f.value}
                            onClick={() => setStato(f.value)}
                            className={`px-3! py-1.5! rounded-full! text-xs font-semibold whitespace-nowrap ${
                                stato === f.value ? "bg-slate-900 text-white border-0!" : "border! border-slate-300! text-slate-700 bg-white"
                            }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <p className="text-sm text-slate-400 text-center py-8">Caricamento…</p>
            ) : documenti.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">Nessun documento.</p>
            ) : (
                documenti.map((d) => (
                    <div key={d.id} className="bg-white rounded-2xl p-4 shadow-sm space-y-2">
                        <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-slate-800 min-w-0 break-words">{d.descrizione}</span>
                            <span className="text-xs text-slate-400 shrink-0">{new Date(d.created_at).toLocaleDateString("it-IT")}</span>
                        </div>
                        <p className="text-sm text-amber-700">{d.esito}</p>
                        <div className="text-xs text-slate-500 grid grid-cols-2 gap-x-4 gap-y-0.5">
                            <span>Utente: {d.user.first_name} {d.user.last_name} ({roleLabel(d.user.role)})</span>
                            <span>Nascita: {d.user.birth_date ? new Date(d.user.birth_date).toLocaleDateString("it-IT") : "—"}</span>
                            <span>Titolo dichiarato: {istruzioneLabel(d.user.livello_istruzione) || "—"}</span>
                            <span>Esperienza dichiarata: {d.user.anni_esperienza ?? 0} anni</span>
                            <span>Anno sul documento: {d.anno ?? "—"}</span>
                            {d.anni != null && <span>Anni coperti: {d.anni}</span>}
                        </div>
                        <button onClick={() => scarica(d)} className="text-sm text-blue-600 p-0! border-0! bg-transparent hover:underline">
                            Apri {d.nome_file}
                        </button>

                        {stato === "revisione_manuale" && (
                            <>
                                <textarea
                                    className="w-full border border-slate-200 rounded-lg p-2 text-sm text-slate-800"
                                    rows={2}
                                    maxLength={500}
                                    placeholder="Nota per l'utente (facoltativa)"
                                    value={note[d.id] ?? ""}
                                    onChange={(e) => setNote({ ...note, [d.id]: e.target.value })}
                                />
                                <div className="flex gap-2">
                                    <button
                                        disabled={busy === d.id}
                                        onClick={() => decidi(d, false)}
                                        className="flex-1 border! border-red-200! text-red-600 bg-white rounded-lg py-2 text-sm font-semibold disabled:opacity-50"
                                    >
                                        Rifiuta
                                    </button>
                                    <button
                                        disabled={busy === d.id}
                                        onClick={() => decidi(d, true)}
                                        className="flex-1 bg-green-600 text-white rounded-lg py-2 text-sm font-semibold border-0! disabled:opacity-50"
                                    >
                                        Approva
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                ))
            )}
        </div>
    );
}
