import { useEffect, useState } from "react";
import axiosClient from "../api/axiosClient";
import { istruzioneLabel } from "../utils/labels";
import type { Documento, DocumentoPreset, RatingDettaglio, TipoDocumento } from "../types/Rating";

type Props = {
    livelloIstruzione?: string | null;
    certificazioni: string[];
    // Aperto da un consiglio del rating: tipo (e certificazione) già scelti
    preset: DocumentoPreset | null;
    onPresetUsed: () => void;
    onChanged: (data: { user: any; rating_dettaglio: RatingDettaglio }) => void;
};

const STATI: Record<Documento["stato"], { label: string; className: string }> = {
    verificato: { label: "Verificato", className: "bg-green-100 text-green-700 border-green-200" },
    rifiutato: { label: "Non verificato", className: "bg-red-100 text-red-700 border-red-200" },
    revisione_manuale: { label: "In revisione", className: "bg-amber-100 text-amber-700 border-amber-200" },
    in_verifica: { label: "In verifica", className: "bg-blue-100 text-blue-700 border-blue-200" },
};

const TIPI: { value: TipoDocumento; label: string; aiuto: string }[] = [
    { value: "istruzione", label: "Titolo di studio", aiuto: "Diploma, certificato di laurea o pergamena." },
    { value: "esperienza", label: "Esperienza", aiuto: "Contratto, busta paga, CU o lettera di referenza." },
    { value: "certificazione", label: "Certificazione", aiuto: "Attestato del corso (es. HACCP, BLSD, lingua)." },
];

const VUOTO = { tipo: "istruzione" as TipoDocumento, riferimento: "", anni: "", anno: "" };

export default function DocumentiVerifica({ livelloIstruzione, certificazioni, preset, onPresetUsed, onChanged }: Props) {
    const [documenti, setDocumenti] = useState<Documento[]>([]);
    const [open, setOpen] = useState(false);
    const [step, setStep] = useState<"dati" | "conferma">("dati");
    const [form, setForm] = useState(VUOTO);
    const [file, setFile] = useState<File | null>(null);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState("");
    const [ultimo, setUltimo] = useState<Documento | null>(null);

    const load = async () => {
        const res = await axiosClient.get("/api/me/documenti");
        setDocumenti(res.data);
    };

    useEffect(() => {
        load().catch(() => {});
    }, []);

    const apri = (p?: DocumentoPreset) => {
        setForm({ ...VUOTO, tipo: p?.tipo ?? "istruzione", riferimento: p?.riferimento ?? "" });
        setFile(null);
        setError("");
        setUltimo(null);
        setStep("dati");
        setOpen(true);
    };

    useEffect(() => {
        if (preset) {
            apri(preset);
            onPresetUsed();
        }
    }, [preset]);

    const datoDaBloccare = () => {
        if (form.tipo === "istruzione") return `il titolo di studio (${istruzioneLabel(livelloIstruzione) || "non indicato"})`;
        if (form.tipo === "esperienza") return "gli anni di esperienza";
        return `la certificazione «${form.riferimento}»`;
    };

    const valida = () => {
        if (!file) return "Scegli il file da caricare.";
        if (form.tipo === "istruzione" && !livelloIstruzione) return "Indica prima il titolo di studio nel curriculum.";
        if (form.tipo === "istruzione" && !form.anno) return "Indica l'anno di conseguimento.";
        if (form.tipo === "esperienza" && !form.anni) return "Indica quanti anni copre il documento.";
        if (form.tipo === "certificazione" && form.riferimento.trim().length < 2) return "Indica il nome della certificazione.";
        return "";
    };

    const avanti = () => {
        const e = valida();
        setError(e);
        if (!e) setStep("conferma");
    };

    const invia = async () => {
        setSending(true);
        setError("");
        const data = new FormData();
        data.append("tipo", form.tipo);
        data.append("conferma", "1");
        data.append("file", file!);
        if (form.riferimento) data.append("riferimento", form.riferimento.trim());
        if (form.anni) data.append("anni", form.anni);
        if (form.anno) data.append("anno", form.anno);

        try {
            const res = await axiosClient.post("/api/me/documenti", data, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            setUltimo(res.data.documento);
            onChanged(res.data);
            await load();
        } catch (err: any) {
            const errors = err?.response?.data?.errors;
            setError(errors ? (Object.values(errors)[0] as string[])[0] : err?.response?.data?.message ?? "Caricamento non riuscito.");
            setStep("dati");
        } finally {
            setSending(false);
        }
    };

    const elimina = async (d: Documento) => {
        const avviso = d.stato === "verificato" ? " Il dato tornerà dichiarato e il rating scenderà." : "";
        if (!window.confirm(`Eliminare il documento «${d.descrizione}»?${avviso}`)) return;
        const res = await axiosClient.delete(`/api/me/documenti/${d.id}`);
        onChanged(res.data);
        await load();
    };

    const input = "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white text-slate-800";

    return (
        <div className="mt-5 border-t border-gray-100 pt-5 text-left">
            <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-slate-700">Documenti di verifica</h3>
                <button
                    type="button"
                    onClick={() => apri()}
                    className="text-xs font-semibold px-3! py-1.5! rounded-lg! border-0! bg-blue-600 text-white hover:bg-blue-700"
                >
                    Carica documento
                </button>
            </div>
            <p className="text-xs text-slate-500 mt-1">
                Ogni dato verificato vale il 100% invece dell'80% e ti dà il badge verde "Certificato".
                I documenti sono privati: li vedono solo le aziende che acquistano la Verifica Premium.
            </p>

            {documenti.length > 0 && (
                <ul className="mt-3 space-y-2">
                    {documenti.map((d) => (
                        <li key={d.id} className="border border-slate-100 rounded-xl p-3">
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-sm font-medium text-slate-800 min-w-0 break-words">{d.descrizione}</span>
                                <span className={`shrink-0 px-2 py-0.5 rounded-full border text-[10px] font-semibold ${STATI[d.stato].className}`}>
                                    {STATI[d.stato].label}
                                </span>
                            </div>
                            {d.esito && <p className="text-xs text-slate-500 mt-1">{d.esito}</p>}
                            <div className="flex items-center justify-between gap-2 mt-1">
                                <span className="text-[11px] text-slate-400 truncate">
                                    {d.nome_file} · {new Date(d.created_at).toLocaleDateString("it-IT")}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => elimina(d)}
                                    className="shrink-0 text-[11px] text-red-600 p-0! border-0! bg-transparent hover:underline"
                                >
                                    Elimina
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            {open && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
                    <div className="absolute inset-0 bg-black/40" onClick={() => !sending && setOpen(false)} />
                    <div className="relative bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 space-y-3 max-h-[90dvh] overflow-y-auto">
                        {ultimo ? (
                            <>
                                <h3 className="text-base font-semibold text-slate-800">Esito della verifica</h3>
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-sm text-slate-700">{ultimo.descrizione}</span>
                                    <span className={`shrink-0 px-2 py-0.5 rounded-full border text-[10px] font-semibold ${STATI[ultimo.stato].className}`}>
                                        {STATI[ultimo.stato].label}
                                    </span>
                                </div>
                                <p className="text-sm text-slate-600">{ultimo.esito}</p>
                                {ultimo.stato === "revisione_manuale" && (
                                    <p className="text-xs text-slate-500">
                                        Un operatore controllerà il documento: riceverai una notifica con l'esito. Fino ad allora il dato resta bloccato.
                                    </p>
                                )}
                                <button
                                    type="button"
                                    onClick={() => setOpen(false)}
                                    className="w-full bg-slate-900 text-white rounded-lg py-2 text-sm font-semibold border-0!"
                                >
                                    Chiudi
                                </button>
                            </>
                        ) : step === "dati" ? (
                            <>
                                <h3 className="text-base font-semibold text-slate-800">Carica un documento</h3>
                                <div className="grid grid-cols-3 gap-1.5">
                                    {TIPI.map((t) => (
                                        <button
                                            key={t.value}
                                            type="button"
                                            onClick={() => setForm({ ...form, tipo: t.value })}
                                            className={`text-xs font-semibold px-2! py-2! rounded-lg! ${
                                                form.tipo === t.value ? "bg-slate-900 text-white border-0!" : "border! border-slate-200! text-slate-600 bg-white"
                                            }`}
                                        >
                                            {t.label}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-xs text-slate-500">{TIPI.find((t) => t.value === form.tipo)!.aiuto}</p>

                                {form.tipo === "istruzione" && (
                                    <>
                                        <p className="text-sm text-slate-700">
                                            Titolo da verificare: <strong>{istruzioneLabel(livelloIstruzione) || "non indicato nel curriculum"}</strong>
                                        </p>
                                        <label className="block text-xs text-slate-500">
                                            Anno di conseguimento
                                            <input type="number" className={input} value={form.anno} min={1940} max={new Date().getFullYear()}
                                                onChange={(e) => setForm({ ...form, anno: e.target.value })} />
                                        </label>
                                    </>
                                )}

                                {form.tipo === "esperienza" && (
                                    <>
                                        <label className="block text-xs text-slate-500">
                                            Anni di esperienza che il documento dimostra
                                            <input type="number" className={input} value={form.anni} min={1} max={60}
                                                onChange={(e) => setForm({ ...form, anni: e.target.value })} />
                                        </label>
                                        <label className="block text-xs text-slate-500">
                                            Anno di inizio (facoltativo)
                                            <input type="number" className={input} value={form.anno} min={1940} max={new Date().getFullYear()}
                                                onChange={(e) => setForm({ ...form, anno: e.target.value })} />
                                        </label>
                                        <label className="block text-xs text-slate-500">
                                            Ruolo e azienda (facoltativo)
                                            <input type="text" className={input} value={form.riferimento} maxLength={255} placeholder="Es. Cameriere, Hotel Excelsior"
                                                onChange={(e) => setForm({ ...form, riferimento: e.target.value })} />
                                        </label>
                                    </>
                                )}

                                {form.tipo === "certificazione" && (
                                    <>
                                        <label className="block text-xs text-slate-500">
                                            Certificazione
                                            <input type="text" className={input} value={form.riferimento} maxLength={255} list="cert-dichiarate"
                                                placeholder="Es. HACCP" onChange={(e) => setForm({ ...form, riferimento: e.target.value })} />
                                            <datalist id="cert-dichiarate">
                                                {certificazioni.map((c) => <option key={c} value={c} />)}
                                            </datalist>
                                        </label>
                                        <label className="block text-xs text-slate-500">
                                            Anno di conseguimento (facoltativo)
                                            <input type="number" className={input} value={form.anno} min={1940} max={new Date().getFullYear()}
                                                onChange={(e) => setForm({ ...form, anno: e.target.value })} />
                                        </label>
                                    </>
                                )}

                                <label className="block text-xs text-slate-500">
                                    File (PDF, JPG, PNG · max 10 MB)
                                    <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="block w-full text-sm text-slate-700 mt-1"
                                        onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                                </label>

                                {error && <p className="text-xs text-red-600">{error}</p>}

                                <div className="flex gap-2 pt-1">
                                    <button type="button" onClick={() => setOpen(false)}
                                        className="flex-1 border! border-slate-200! bg-white text-slate-700 rounded-lg py-2 text-sm">
                                        Annulla
                                    </button>
                                    <button type="button" onClick={avanti}
                                        className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-semibold border-0!">
                                        Continua
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                {/* Business plan, par. 3.3: alert di conferma prima dell'invio definitivo */}
                                <h3 className="text-base font-semibold text-slate-800">Confermi l'invio?</h3>
                                <p className="text-sm text-slate-600">
                                    Fino all'esito della verifica non potrai modificare <strong>{datoDaBloccare()}</strong> nel curriculum.
                                </p>
                                <p className="text-xs text-slate-500">
                                    Il documento viene controllato automaticamente per coerenza con i dati del profilo.
                                    I casi dubbi passano a un operatore.
                                </p>
                                {error && <p className="text-xs text-red-600">{error}</p>}
                                <div className="flex gap-2 pt-1">
                                    <button type="button" onClick={() => setStep("dati")} disabled={sending}
                                        className="flex-1 border! border-slate-200! bg-white text-slate-700 rounded-lg py-2 text-sm">
                                        Indietro
                                    </button>
                                    <button type="button" onClick={invia} disabled={sending}
                                        className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-semibold border-0! disabled:opacity-50">
                                        {sending ? "Verifica in corso…" : "Conferma e invia"}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
