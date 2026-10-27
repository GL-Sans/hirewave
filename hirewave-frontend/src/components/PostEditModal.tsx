import { useState } from "react";
import axiosClient from "../api/axiosClient";
import type { FeedPost } from "../types/Feed";

const CONTRACT_TYPES = [
    "Contratto a tempo indeterminato",
    "Contratto a tempo determinato",
    "Partita IVA",
    "Apprendistato",
    "Part-time",
    "A chiamata",
];

type Props = {
    post: FeedPost;
    onClose: () => void;
    onSaved: (post: FeedPost) => void;
};

// Modifica di un proprio post (menu "..." → Modifica)
export default function PostEditModal({ post, onClose, onSaved }: Props) {
    const [form, setForm] = useState({
        title: post.title,
        description: post.description ?? "",
        location: post.location ?? "",
        contract_type: post.contract_type ?? "",
        budget: post.budget ?? "",
        budget_type: post.budget_type ?? "Ora",
    });
    const [newImage, setNewImage] = useState<File | null>(null);
    const [removeImage, setRemoveImage] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const set = (key: keyof typeof form) =>
        (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
            setForm({ ...form, [key]: e.target.value });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError("");
        try {
            const data = new FormData();
            data.append("title", form.title);
            data.append("description", form.description);
            data.append("location", form.location);
            if (form.contract_type) data.append("contract_type", form.contract_type);
            if (form.budget !== "") {
                data.append("budget", String(form.budget));
                data.append("budget_type", form.budget_type);
            }
            if (newImage) data.append("image", newImage);
            if (removeImage && !newImage) data.append("remove_image", "1");

            const res = await axiosClient.post(`/api/posts/${post.id}`, data, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            onSaved({ ...post, ...res.data, user: post.user });
            onClose();
        } catch (err: any) {
            const errors = err?.response?.data?.errors;
            setError(errors ? (Object.values(errors)[0] as string[])[0] : "Errore durante il salvataggio.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4" onClick={onClose}>
            <form
                onSubmit={handleSubmit}
                onClick={(e) => e.stopPropagation()}
                className="w-full sm:max-w-lg max-h-[90dvh] overflow-y-auto bg-white text-slate-800 rounded-t-2xl sm:rounded-2xl p-5 space-y-3"
            >
                <h2 className="text-lg font-bold text-slate-900">Modifica post</h2>

                <input value={form.title} onChange={set("title")} required maxLength={255} placeholder="Titolo" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                <textarea value={form.description} onChange={set("description")} rows={4} placeholder="Descrizione" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                <input value={form.location} onChange={set("location")} placeholder="Località" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />

                <select value={form.contract_type} onChange={set("contract_type")} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white">
                    <option value="">Nessun tipo di contratto</option>
                    {CONTRACT_TYPES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>

                <div className="flex gap-2">
                    <input type="number" min={0} step={1} value={form.budget} onChange={set("budget")} placeholder="Budget €" className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                    <select value={form.budget_type} onChange={set("budget_type")} className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white">
                        <option value="Ora">Ora</option>
                        <option value="Mensile">Mensile</option>
                        <option value="Fisso">Fisso</option>
                    </select>
                </div>

                <div className="space-y-1 text-sm">
                    <label className="block text-slate-500">Immagine</label>
                    <input type="file" accept="image/*" onChange={(e) => setNewImage(e.target.files?.[0] ?? null)} className="block w-full text-sm" />
                    {post.image && !newImage && (
                        <label className="flex items-center gap-2 text-slate-600">
                            <input type="checkbox" checked={removeImage} onChange={(e) => setRemoveImage(e.target.checked)} />
                            Rimuovi l'immagine attuale
                        </label>
                    )}
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}

                <div className="flex gap-2 pt-2">
                    <button type="button" onClick={onClose} className="flex-1 border border-slate-200 text-slate-700 py-2 rounded-lg text-sm font-semibold">
                        Annulla
                    </button>
                    <button type="submit" disabled={saving} className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-semibold disabled:opacity-50">
                        {saving ? "Salvataggio..." : "Salva modifiche"}
                    </button>
                </div>
            </form>
        </div>
    );
}
