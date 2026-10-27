import { useState } from "react";
import axiosClient from "../api/axiosClient";

const REASONS = [
    { value: "spam", label: "Spam o pubblicità" },
    { value: "truffa", label: "Truffa o offerta sospetta" },
    { value: "inappropriato", label: "Contenuto inappropriato" },
    { value: "falso", label: "Informazioni false" },
    { value: "altro", label: "Altro" },
];

type Props = {
    postId: number;
    onClose: () => void;
    onReported: () => void;
};

// Menu "..." → Segnala
export default function ReportModal({ postId, onClose, onReported }: Props) {
    const [reason, setReason] = useState("");
    const [details, setDetails] = useState("");
    const [sending, setSending] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!reason) return;
        setSending(true);
        setError("");
        try {
            await axiosClient.post(`/api/posts/${postId}/report`, { reason, details: details || null });
            onReported();
            onClose();
        } catch (err: any) {
            setError(err?.response?.data?.message ?? "Errore durante l'invio della segnalazione.");
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4" onClick={onClose}>
            <form
                onSubmit={handleSubmit}
                onClick={(e) => e.stopPropagation()}
                className="w-full sm:max-w-md bg-white text-slate-800 rounded-t-2xl sm:rounded-2xl p-5 space-y-3"
            >
                <h2 className="text-lg font-bold text-slate-900">Segnala post</h2>
                <p className="text-sm text-slate-500">
                    Il post non ti verrà più mostrato. Con più segnalazioni viene nascosto a tutti.
                </p>

                <div className="space-y-1">
                    {REASONS.map((r) => (
                        <label key={r.value} className="flex items-center gap-2 text-sm py-1 cursor-pointer">
                            <input type="radio" name="reason" value={r.value} checked={reason === r.value} onChange={() => setReason(r.value)} />
                            {r.label}
                        </label>
                    ))}
                </div>

                <textarea
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    rows={3}
                    maxLength={1000}
                    placeholder="Dettagli (facoltativo)"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                />

                {error && <p className="text-sm text-red-600">{error}</p>}

                <div className="flex gap-2">
                    <button type="button" onClick={onClose} className="flex-1 border border-slate-200 text-slate-700 py-2 rounded-lg text-sm font-semibold">
                        Annulla
                    </button>
                    <button type="submit" disabled={!reason || sending} className="flex-1 bg-red-600 text-white py-2 rounded-lg text-sm font-semibold disabled:opacity-50">
                        {sending ? "Invio..." : "Invia segnalazione"}
                    </button>
                </div>
            </form>
        </div>
    );
}
