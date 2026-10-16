import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const DOMANDE_WORKER = [
    { id: "settore", domanda: "In quale settore vuoi lavorare?", tipo: "select", opzioni: ["Ristorazione / HoReCa", "Turismo / Hospitality", "Eventi", "Logistica", "Commercio / Retail", "IT / Digitale", "Altro"] },
    { id: "ral_aspettativa", domanda: "Qual è la tua aspettativa di retribuzione?", tipo: "select", opzioni: ["Meno di €1.000/mese", "€1.000 – €1.500/mese", "€1.500 – €2.000/mese", "€2.000 – €3.000/mese", "Oltre €3.000/mese", "Tariffa giornaliera / Freelance"] },
    { id: "livello_istruzione", domanda: "Qual è il tuo livello di istruzione?", tipo: "select", opzioni: [{ label: "Licenza media", value: "licenza_media" }, { label: "Diploma", value: "diploma" }, { label: "Laurea Triennale", value: "laurea_triennale" }, { label: "Laurea Magistrale", value: "laurea_magistrale" }] },
    { id: "anni_esperienza", domanda: "Quanti anni di esperienza hai nel settore?", tipo: "select", opzioni: [{ label: "Nessuna esperienza", value: "0" }, { label: "Meno di 1 anno", value: "1" }, { label: "1 – 3 anni", value: "2" }, { label: "3 – 5 anni", value: "4" }, { label: "5 – 10 anni", value: "7" }, { label: "Oltre 10 anni", value: "11" }] },
    { id: "certificazioni", domanda: "Hai certificazioni o titoli specifici?", tipo: "text", placeholder: "Es. HACCP, AIBES, Patente nautica... (opzionale)" },
];

const DOMANDE_COMPANY = [
    { id: "settore", domanda: "In quale settore opera la tua azienda?", tipo: "select", opzioni: ["Ristorazione / HoReCa", "Turismo / Hospitality", "Eventi", "Logistica", "Commercio / Retail", "IT / Digitale", "Altro"] },
    { id: "ral_aspettativa", domanda: "Qual è la retribuzione media che offri?", tipo: "select", opzioni: ["Meno di €1.000/mese", "€1.000 – €1.500/mese", "€1.500 – €2.000/mese", "€2.000 – €3.000/mese", "Oltre €3.000/mese", "Tariffa giornaliera / Freelance"] },
    { id: "livello_istruzione", domanda: "Che dimensione ha la tua azienda?", tipo: "select", opzioni: [{ label: "Micro (1-5 dipendenti)", value: "licenza_media" }, { label: "Piccola (6-20 dipendenti)", value: "diploma" }, { label: "Media (21-50 dipendenti)", value: "laurea_triennale" }, { label: "Grande (50+ dipendenti)", value: "laurea_magistrale" }] },
    { id: "anni_esperienza", domanda: "Da quanti anni è attiva l'azienda?", tipo: "select", opzioni: [{ label: "Meno di 1 anno", value: "1" }, { label: "1 – 3 anni", value: "2" }, { label: "3 – 5 anni", value: "4" }, { label: "5 – 10 anni", value: "7" }, { label: "Oltre 10 anni", value: "11" }] },
    { id: "certificazioni", domanda: "Hai certificazioni o requisiti specifici per i candidati?", tipo: "text", placeholder: "Es. HACCP obbligatorio, patente B... (opzionale)" },
];

export default function OnboardingPage() {
    const navigate = useNavigate();
    const { fetchUser, user } = useAuth();
    const DOMANDE = user?.role === "COMPANY" ? DOMANDE_COMPANY : DOMANDE_WORKER;
    const [step, setStep] = useState(0);
    const [risposte, setRisposte] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);
    const [errore, setErrore] = useState("");

    const domanda = DOMANDE[step];
    const isUltimo = step === DOMANDE.length - 1;

    const handleRisposta = (valore: string) => {
        setRisposte((prev) => ({ ...prev, [domanda.id]: valore }));
    };

    const handleAvanti = () => {
        if (!risposte[domanda.id] && domanda.id !== "certificazioni") return;
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
            const res = await fetch("/api/onboarding", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Accept": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    ...risposte,
                    anni_esperienza: parseInt(risposte.anni_esperienza || "0"),
                }),
            });
            if (!res.ok) throw new Error("Errore invio");
            await fetchUser();
            navigate("/feed");
        } catch {
            setErrore("Errore durante il salvataggio. Riprova.");
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

                {errore && <p className="text-red-500 text-sm mt-3">{errore}</p>}

                <button
                    onClick={handleAvanti}
                    disabled={loading || (!risposte[domanda.id] && domanda.id !== "certificazioni")}
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