import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CheckIcon } from "@heroicons/react/24/solid";
import axiosClient from "../api/axiosClient";
import { useAuth } from "../context/AuthContext";
import { PIANI } from "../utils/labels";
import type { Piano } from "../utils/labels";
import { confermaRitornoStripe, messaggioErrore } from "../utils/sblocco";

type Stato = { piano: Piano | null; scade_at: string | null };

// Listino del business plan, par. 8.1
const SCHEDE: { id: Piano | null; nome: string; prezzo: string; sotto: string; punti: string[]; evidenza?: boolean }[] = [
    {
        id: null,
        nome: "Free",
        prezzo: "0",
        sotto: "per sempre",
        punti: ["Profilo e rating tecnico", "Verifica documenti e badge verde", "Tutor: 15 domande al giorno", "Candidature e chat"],
    },
    {
        id: "premium",
        nome: "Premium",
        prezzo: PIANI.premium.prezzo,
        sotto: "al mese",
        punti: ["Profilo in evidenza nei Talenti", "Priorità nei risultati di ricerca", "Analisi della retribuzione rispetto al mercato", "Tutor illimitato"],
        evidenza: true,
    },
    {
        id: "boost",
        nome: "Boost",
        prezzo: PIANI.boost.prezzo,
        sotto: "al mese",
        punti: ["Tutto il Premium", "Primo posto nei risultati", "Badge «Sponsor» sul profilo", "I tuoi post in cima al feed"],
    },
];

export default function AbbonamentiPage() {
    const { user, fetchUser } = useAuth();
    const [stato, setStato] = useState<Stato | null>(null);
    const [inCorso, setInCorso] = useState<Piano | "disdici" | null>(null);
    const [notice, setNotice] = useState("");

    useEffect(() => {
        (async () => {
            const params = new URLSearchParams(window.location.search);
            const attivato = params.get("attivato");
            if (await confermaRitornoStripe()) setNotice("Pagamento ricevuto: il tuo piano è attivo.");
            if (attivato) window.history.replaceState(null, "", "/abbonamenti");
            const res = await axiosClient.get("/api/me");
            setStato(res.data.abbonamento);
        })();
    }, []);

    if (user?.role === "COMPANY") {
        return (
            <div className="max-w-xl mx-auto bg-white rounded-2xl border border-slate-200 p-6 text-center space-y-3">
                <h1 className="text-xl font-bold text-slate-900">Nessun abbonamento per le aziende</h1>
                <p className="text-sm text-slate-600">
                    Paghi solo quando trovi il candidato giusto: €14,99 per un profilo dichiarato, €29,99 per un profilo certificato.
                </p>
                <Link to="/talents" className="inline-flex px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700">
                    Sfoglia i talenti
                </Link>
            </div>
        );
    }

    const attiva = async (piano: Piano) => {
        setInCorso(piano);
        try {
            const res = await axiosClient.post("/api/abbonamento", { piano });
            if (res.data.demo) {
                setStato(res.data.abbonamento);
                setNotice(`Piano ${PIANI[piano].nome} attivo (pagamento demo) per 30 giorni.`);
                fetchUser();
            } else if (res.data.url) {
                window.location.href = res.data.url;
            }
        } catch (err) {
            alert(messaggioErrore(err));
        } finally {
            setInCorso(null);
        }
    };

    const disdici = async () => {
        if (!confirm("Vuoi tornare al piano Free?")) return;
        setInCorso("disdici");
        try {
            const res = await axiosClient.delete("/api/abbonamento");
            setStato(res.data.abbonamento);
            setNotice("Sei tornato al piano Free.");
            fetchUser();
        } finally {
            setInCorso(null);
        }
    };

    const attuale = stato?.piano ?? null;

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-6">
            <div className="text-center space-y-2">
                <h1 className="text-2xl font-bold text-slate-900">Fatti trovare per primo</h1>
                <p className="text-sm text-slate-500 max-w-xl mx-auto">
                    Il rating resta tuo e gratuito. Con Premium e Boost il tuo profilo sale nei risultati che le aziende vedono.
                </p>
            </div>

            {notice && (
                <p className="max-w-xl mx-auto text-sm text-green-700 bg-green-50 border border-green-100 rounded-xl px-3 py-2 text-center">{notice}</p>
            )}

            <div className="grid md:grid-cols-3 gap-4">
                {SCHEDE.map((s) => {
                    const corrente = attuale === s.id;
                    return (
                        <div
                            key={s.nome}
                            className={`relative bg-white rounded-2xl border p-5 flex flex-col ${
                                s.evidenza ? "border-violet-300 shadow-lg md:-translate-y-1" : "border-slate-200 shadow-sm"
                            }`}
                        >
                            {s.evidenza && (
                                <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[11px] font-bold bg-violet-600 text-white rounded-full px-3 py-1">
                                    Il più scelto
                                </span>
                            )}
                            <p className="text-sm font-bold text-slate-700">{s.nome}</p>
                            <p className="mt-2">
                                <span className="text-3xl font-bold text-slate-900">€{s.prezzo}</span>
                                <span className="text-sm text-slate-400"> {s.sotto}</span>
                            </p>
                            <ul className="mt-4 space-y-2 flex-1">
                                {s.punti.map((p) => (
                                    <li key={p} className="flex gap-2 text-sm text-slate-600">
                                        <CheckIcon className={`w-4 h-4 shrink-0 mt-0.5 ${s.evidenza ? "text-violet-600" : "text-green-600"}`} />
                                        {p}
                                    </li>
                                ))}
                            </ul>
                            <div className="mt-5">
                                {corrente ? (
                                    <div className="space-y-2">
                                        <p className="text-center text-sm font-semibold text-green-700 bg-green-50 border border-green-100 rounded-xl py-2">
                                            Il tuo piano
                                        </p>
                                        {s.id && stato?.scade_at && (
                                            <p className="text-[11px] text-slate-400 text-center">
                                                Attivo fino al {new Date(stato.scade_at).toLocaleDateString("it-IT")}
                                            </p>
                                        )}
                                    </div>
                                ) : s.id ? (
                                    <button
                                        onClick={() => attiva(s.id!)}
                                        disabled={inCorso !== null || !stato}
                                        className={`w-full py-2.5 text-sm font-semibold rounded-xl disabled:opacity-50 ${
                                            s.evidenza
                                                ? "bg-violet-600 text-white hover:bg-violet-700 border-0!"
                                                : "bg-slate-900 text-white hover:bg-slate-700 border-0!"
                                        }`}
                                    >
                                        {inCorso === s.id ? "Attivazione…" : attuale ? `Passa a ${s.nome}` : `Attiva ${s.nome}`}
                                    </button>
                                ) : (
                                    attuale && (
                                        <button
                                            onClick={disdici}
                                            disabled={inCorso !== null}
                                            className="w-full py-2.5 text-sm font-semibold rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                                        >
                                            {inCorso === "disdici" ? "…" : "Torna a Free"}
                                        </button>
                                    )
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            <p className="text-xs text-slate-400 text-center">
                Ogni piano dura 30 giorni e si può disdire quando vuoi.
            </p>
        </div>
    );
}
