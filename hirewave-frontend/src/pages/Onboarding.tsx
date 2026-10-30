import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import axiosClient from "../api/axiosClient";
import { RETRIBUZIONI } from "../utils/labels";

type Opzione = string | { label: string; value: string };
type Domanda = {
    id: string;
    domanda: string;
    tipo: "select" | "text" | "periodo";
    opzioni?: Opzione[];
    placeholder?: string;
    nota?: string;
};

const SETTORI = ["Ristorazione / HoReCa", "Turismo / Hospitality", "Eventi", "Logistica", "Commercio / Retail", "IT / Digitale", "Altro"];
const ESPERIENZA = [{ label: "Nessuna esperienza", value: "0" }, { label: "Meno di 1 anno", value: "1" }, { label: "1 – 3 anni", value: "2" }, { label: "3 – 5 anni", value: "4" }, { label: "5 – 10 anni", value: "7" }, { label: "Oltre 10 anni", value: "11" }];

// Due percorsi dello stesso prodotto (business plan, par. 2.3): la scelta è del lavoratore
const PERCORSO: Domanda = {
    id: "percorso",
    domanda: "Che profilo vuoi creare?",
    tipo: "select",
    opzioni: [
        { label: "☀ Lavoro stagionale — profilo rapido: quando e dove sei disponibile", value: "stagionale" },
        { label: "✓ Profilo certificato — titolo e certificazioni, per il badge verde", value: "certificato" },
    ],
    nota: "Puoi passare al profilo certificato quando vuoi, completando il curriculum.",
};

const DOMANDE_STAGIONALE: Domanda[] = [
    { id: "settore", domanda: "In quale settore vuoi lavorare?", tipo: "select", opzioni: SETTORI },
    { id: "disponibilita", domanda: "Quando sei disponibile?", tipo: "periodo", nota: "La data di fine è facoltativa." },
    { id: "zona", domanda: "In quale zona?", tipo: "text", placeholder: "Es. Pescara e costa teatina" },
    { id: "ral_aspettativa", domanda: "Quanto vorresti guadagnare?", tipo: "select", opzioni: RETRIBUZIONI },
    { id: "anni_esperienza", domanda: "Quanta esperienza hai nel settore?", tipo: "select", opzioni: ESPERIENZA },
];

const DOMANDE_WORKER: Domanda[] = [
    { id: "settore", domanda: "In quale settore vuoi lavorare?", tipo: "select", opzioni: SETTORI },
    { id: "ral_aspettativa", domanda: "Qual è la tua aspettativa di retribuzione?", tipo: "select", opzioni: RETRIBUZIONI },
    { id: "livello_istruzione", domanda: "Qual è il tuo livello di istruzione?", tipo: "select", opzioni: [{ label: "Licenza media", value: "licenza_media" }, { label: "Diploma", value: "diploma" }, { label: "Laurea Triennale", value: "laurea_triennale" }, { label: "Laurea Magistrale", value: "laurea_magistrale" }] },
    { id: "anni_esperienza", domanda: "Quanti anni di esperienza hai nel settore?", tipo: "select", opzioni: ESPERIENZA },
    { id: "certificazioni", domanda: "Hai certificazioni o titoli specifici?", tipo: "text", placeholder: "Es. HACCP, AIBES, Patente nautica... (opzionale)" },
];

const DOMANDE_COMPANY: Domanda[] = [
    { id: "settore", domanda: "In quale settore opera la tua azienda?", tipo: "select", opzioni: ["Ristorazione / HoReCa", "Turismo / Hospitality", "Eventi", "Logistica", "Commercio / Retail", "IT / Digitale", "Altro"] },
    { id: "ral_aspettativa", domanda: "Qual è la retribuzione media che offri?", tipo: "select", opzioni: RETRIBUZIONI },
    { id: "dimensione_azienda", domanda: "Che dimensione ha la tua azienda?", tipo: "select", opzioni: [{ label: "Micro (1-5 dipendenti)", value: "micro" }, { label: "Piccola (6-20 dipendenti)", value: "piccola" }, { label: "Media (21-50 dipendenti)", value: "media" }, { label: "Grande (50+ dipendenti)", value: "grande" }] },
    { id: "anni_esperienza", domanda: "Da quanti anni è attiva l'azienda?", tipo: "select", opzioni: [{ label: "Meno di 1 anno", value: "1" }, { label: "1 – 3 anni", value: "2" }, { label: "3 – 5 anni", value: "4" }, { label: "5 – 10 anni", value: "7" }, { label: "Oltre 10 anni", value: "11" }] },
    { id: "certificazioni", domanda: "Hai certificazioni o requisiti specifici per i candidati?", tipo: "text", placeholder: "Es. HACCP obbligatorio, patente B... (opzionale)" },
];

export default function OnboardingPage() {
    const navigate = useNavigate();
    const { fetchUser, user } = useAuth();
    const [step, setStep] = useState(0);
    const [risposte, setRisposte] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);
    const [errore, setErrore] = useState("");

    const DOMANDE: Domanda[] = user?.role === "COMPANY"
        ? DOMANDE_COMPANY
        : [PERCORSO, ...(risposte.percorso === "stagionale" ? DOMANDE_STAGIONALE : DOMANDE_WORKER)];

    const domanda = DOMANDE[step];
    const isUltimo = step === DOMANDE.length - 1;
    // Il periodo vale come risposta quando c'è la data di inizio
    const risposta = domanda.tipo === "periodo" ? risposte.disponibilita_da : risposte[domanda.id];
    const facoltativa = domanda.id === "certificazioni";

    const handleRisposta = (valore: string, campo = domanda.id) => {
        setRisposte((prev) => ({ ...prev, [campo]: valore }));
    };

    const handleAvanti = () => {
        if (!risposta && !facoltativa) return;
        if (isUltimo) {
            handleSubmit();
        } else {
            setStep((s) => s + 1);
        }
    };

    const handleSubmit = async () => {
        setLoading(true);
        setErrore("");
        try {
            // axiosClient invia il token CSRF richiesto dal backend
            await axiosClient.post("/api/onboarding", {
                ...risposte,
                anni_esperienza: parseInt(risposte.anni_esperienza || "0"),
            });
            await fetchUser();
            navigate("/feed");
        } catch (err: any) {
            const errors = err?.response?.data?.errors;
            setErrore(errors ? (Object.values(errors)[0] as string[])[0] : "Errore durante il salvataggio. Riprova.");
        } finally {
            setLoading(false);
        }
    };

    const opzioni = domanda.tipo === "select" ? domanda.opzioni ?? [] : [];

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-sm p-8">
                {/* Progress */}
                <div className="flex gap-1 mb-8">
                    {DOMANDE.map((_, i) => (
                        <div
                            key={i}
                            className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? "bg-blue-600" : "bg-slate-200"}`}
                        />
                    ))}
                </div>

                <p className="text-xs text-slate-400 mb-2">{step + 1} di {DOMANDE.length}</p>
                <h2 className="text-xl font-bold text-slate-900 mb-6">{domanda.domanda}</h2>

                {domanda.tipo === "select" && (
                    <div className="flex flex-col gap-2">
                        {opzioni.map((op) => {
                            const valore = typeof op === "string" ? op : op.value;
                            const etichetta = typeof op === "string" ? op : op.label;
                            return (
                                <button
                                    key={valore}
                                    onClick={() => handleRisposta(valore)}
                                    className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-colors ${
                                        risposte[domanda.id] === valore
                                            ? "border-blue-600 bg-blue-50 text-blue-700 font-medium"
                                            : "border-slate-200 hover:border-slate-300 text-slate-700"
                                    }`}
                                >
                                    {etichetta}
                                </button>
                            );
                        })}
                    </div>
                )}

                {domanda.tipo === "text" && (
                    <input
                        type="text"
                        placeholder={domanda.placeholder}
                        value={risposte[domanda.id] || ""}
                        onChange={(e) => handleRisposta(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                    />
                )}

                {domanda.tipo === "periodo" && (
                    <div className="grid grid-cols-2 gap-3">
                        {[
                            { campo: "disponibilita_da", label: "Dal" },
                            { campo: "disponibilita_a", label: "Al" },
                        ].map(({ campo, label }) => (
                            <label key={campo} className="min-w-0 text-xs text-slate-500">
                                {label}
                                <input
                                    type="date"
                                    value={risposte[campo] || ""}
                                    min={campo === "disponibilita_a" ? risposte.disponibilita_da : undefined}
                                    onChange={(e) => handleRisposta(e.target.value, campo)}
                                    className="mt-1 w-full max-w-full min-w-0 appearance-none border border-slate-200 rounded-xl px-3 py-3 text-sm bg-white text-slate-700"
                                />
                            </label>
                        ))}
                    </div>
                )}

                {domanda.nota && <p className="text-xs text-slate-400 mt-3">{domanda.nota}</p>}

                {errore && <p className="text-red-500 text-sm mt-3">{errore}</p>}

                <button
                    onClick={handleAvanti}
                    disabled={loading || (!risposta && !facoltativa)}
                    className="mt-6 w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 transition disabled:opacity-40"
                >
                    {loading ? "Salvataggio..." : isUltimo ? "Completa profilo" : "Avanti →"}
                </button>

                {step > 0 && (
                    <button
                        onClick={() => setStep((s) => s - 1)}
                        className="mt-3 w-full text-slate-400 text-sm hover:text-slate-600 transition"
                    >
                        ← Indietro
                    </button>
                )}
            </div>
        </div>
    );
}