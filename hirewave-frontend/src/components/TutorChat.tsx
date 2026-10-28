import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { PaperAirplaneIcon, SparklesIcon, XMarkIcon } from "@heroicons/react/24/outline";
import axiosClient from "../api/axiosClient";
import { useAuth } from "../context/AuthContext";

type Azione = { label: string; to: string };
type Messaggio = { id: number | string; autore: "utente" | "tutor"; testo: string; azioni?: Azione[] };
type Limite = { usate: number; massimo: number; restanti: number } | null;

// Pagine dove il pulsante darebbe fastidio (la chat su mobile è a schermo intero)
const NASCOSTO_SU = ["/chat", "/onboarding"];

/** Tutor HireWave: chat di aiuto sempre a portata di mano (business plan, par. 4.1) */
export default function TutorChat() {
    const { user } = useAuth();
    const location = useLocation();
    const [open, setOpen] = useState(false);
    const [loaded, setLoaded] = useState(false);
    const [messaggi, setMessaggi] = useState<Messaggio[]>([]);
    const [suggerimenti, setSuggerimenti] = useState<string[]>([]);
    const [limite, setLimite] = useState<Limite>(null);
    const [testo, setTesto] = useState("");
    const [attesa, setAttesa] = useState(false);
    const [errore, setErrore] = useState("");
    const listRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Conversazione caricata solo alla prima apertura
    useEffect(() => {
        if (!open || loaded) return;
        axiosClient.get("/api/tutor").then((res) => {
            const b = res.data.benvenuto;
            setMessaggi([{ id: "benvenuto", autore: "tutor", testo: b.testo, azioni: b.azioni }, ...res.data.messaggi]);
            setSuggerimenti(b.suggerimenti ?? []);
            setLimite(res.data.limite);
            setLoaded(true);
        }).catch(() => setErrore("Tutor non disponibile, riprova tra poco."));
    }, [open, loaded]);

    useEffect(() => {
        const el = listRef.current;
        if (el) el.scrollTop = el.scrollHeight;
    }, [messaggi.length, attesa, open]);

    useEffect(() => {
        if (open) inputRef.current?.focus();
    }, [open]);

    // Esc chiude il pannello
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open]);

    if (!user || NASCOSTO_SU.some((p) => location.pathname.startsWith(p))) return null;

    const invia = async (domanda: string) => {
        const q = domanda.trim();
        if (!q || attesa) return;
        setErrore("");
        setTesto("");
        setSuggerimenti([]);
        setMessaggi((m) => [...m, { id: `u${Date.now()}`, autore: "utente", testo: q }]);
        setAttesa(true);
        try {
            const res = await axiosClient.post("/api/tutor", { testo: q });
            setMessaggi((m) => [...m, { id: `t${Date.now()}`, autore: "tutor", testo: res.data.testo, azioni: res.data.azioni }]);
            setSuggerimenti(res.data.suggerimenti ?? []);
            setLimite(res.data.limite);
        } catch (err: any) {
            if (err?.response?.data?.limite) setLimite(err.response.data.limite);
            setErrore(err?.response?.data?.message ?? "Risposta non arrivata, riprova.");
        } finally {
            setAttesa(false);
        }
    };

    const esaurito = limite !== null && limite.restanti <= 0;

    return (
        <>
            {!open && (
                <button
                    onClick={() => setOpen(true)}
                    // Su telefono solo l'icona: copre meno contenuto
                    className="fixed z-40 right-3 bottom-20 md:right-4 md:bottom-6 w-12! h-12! md:w-auto! p-0! md:pl-3! md:pr-4! rounded-full! border-0! bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition flex items-center justify-center gap-2"
                    aria-label="Apri il tutor HireWave"
                >
                    <SparklesIcon className="w-5 h-5" />
                    <span className="hidden md:inline text-sm font-semibold">Tutor</span>
                </button>
            )}

            {open && (
                <div
                    role="dialog"
                    aria-label="Tutor HireWave"
                    className="fixed z-[70] inset-x-2 bottom-2 top-16 md:inset-auto md:right-6 md:bottom-6 md:w-[380px] md:h-[560px] md:max-h-[calc(100dvh-110px)] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
                >
                    <div className="shrink-0 px-4 py-3 bg-gradient-to-r from-blue-600 to-violet-600 text-white flex items-center gap-2">
                        <SparklesIcon className="w-5 h-5" />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold leading-tight">Tutor HireWave</p>
                            <p className="text-[11px] text-white/80 leading-tight">
                                {limite ? `${limite.restanti}/${limite.massimo} domande oggi` : "Domande illimitate"}
                            </p>
                        </div>
                        <button
                            onClick={() => setOpen(false)}
                            className="p-1! border-0! bg-transparent text-white/90 hover:text-white"
                            aria-label="Chiudi il tutor"
                        >
                            <XMarkIcon className="w-5 h-5" />
                        </button>
                    </div>

                    <div ref={listRef} className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 space-y-3 bg-slate-50">
                        {messaggi.map((m) => (
                            <div key={m.id} className={`flex ${m.autore === "utente" ? "justify-end" : "justify-start"}`}>
                                <div
                                    className={`max-w-[88%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words ${
                                        m.autore === "utente"
                                            ? "bg-blue-600 text-white rounded-br-md"
                                            : "bg-white text-slate-700 border border-slate-200 rounded-bl-md"
                                    }`}
                                >
                                    {m.testo}
                                    {m.azioni && m.azioni.length > 0 && (
                                        <div className="mt-2 flex flex-wrap gap-1.5">
                                            {m.azioni.map((a) => (
                                                <Link
                                                    key={a.to + a.label}
                                                    to={a.to}
                                                    onClick={() => window.matchMedia("(max-width: 767px)").matches && setOpen(false)}
                                                    className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-100 rounded-full px-2.5 py-1 hover:bg-blue-100"
                                                >
                                                    {a.label} →
                                                </Link>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        {attesa && (
                            <div className="flex justify-start">
                                <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-md px-3 py-2.5 flex gap-1" aria-label="Il tutor sta scrivendo">
                                    {[0, 150, 300].map((d) => (
                                        <span key={d} className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: `${d}ms` }} />
                                    ))}
                                </div>
                            </div>
                        )}
                        {!loaded && !errore && <p className="text-xs text-slate-400 text-center">Caricamento…</p>}
                    </div>

                    <div className="shrink-0 border-t border-slate-100 p-2 space-y-2 bg-white">
                        {suggerimenti.length > 0 && !esaurito && (
                            <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
                                {suggerimenti.map((s) => (
                                    <button
                                        key={s}
                                        onClick={() => invia(s)}
                                        className="shrink-0 text-xs font-medium px-3! py-1.5! rounded-full! border! border-slate-200! bg-white text-slate-700 hover:bg-slate-50"
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        )}
                        {errore && <p className="text-xs text-red-500 px-1">{errore}</p>}
                        {esaurito ? (
                            <Link
                                to="/abbonamenti"
                                onClick={() => setOpen(false)}
                                className="block text-center text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-blue-600 rounded-xl py-2.5"
                            >
                                Tutor illimitato con Premium · €14,99/mese
                            </Link>
                        ) : (
                            <form
                                onSubmit={(e) => { e.preventDefault(); invia(testo); }}
                                className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-2xl"
                            >
                                <input
                                    ref={inputRef}
                                    value={testo}
                                    onChange={(e) => setTesto(e.target.value)}
                                    maxLength={500}
                                    placeholder={user.role === "COMPANY" ? "Es. cerco un cameriere con HACCP" : "Es. come aumento il rating?"}
                                    className="flex-1 min-w-0 bg-transparent border-none outline-none text-base md:text-sm"
                                />
                                <button
                                    type="submit"
                                    disabled={!testo.trim() || attesa}
                                    className="p-2! bg-blue-600 text-white rounded-xl! border-0! hover:bg-blue-700 disabled:opacity-40 shrink-0"
                                    aria-label="Invia"
                                >
                                    <PaperAirplaneIcon className="w-4 h-4" />
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
