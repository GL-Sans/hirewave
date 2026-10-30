import { useState, useRef, useEffect, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
    MagnifyingGlassIcon,
    PaperAirplaneIcon,
    ChevronLeftIcon,
} from "@heroicons/react/24/outline";
import { ChatMessage } from "../components/ChatMessage";
import axiosClient from "../api/axiosClient";
import { useAuth } from "../context/AuthContext";
import { profilePath } from "../utils/profilePath";
import { euro, istruzioneLabel, roleLabel } from "../utils/labels";
import { avviaSblocco, avvisoSblocco, confermaRitornoStripe, messaggioErrore } from "../utils/sblocco";
import { useBackClose } from "../hooks/useBackClose";

type Contact = {
    id: number;
    first_name: string;
    last_name: string | null;
    role: string;
    profile_image: string | null;
    badge?: string;
};

// Dati visibili prima dello sblocco, per decidere senza lasciare la chat
type OffertaSblocco = {
    prezzo: number;
    badge: string;
    rating_tecnico: number | null;
    rating_reputazionale: number | null;
    settore: string | null;
    livello_istruzione: string | null;
    ral_aspettativa: string | null;
};

// Messaggi preimpostati: gli unici consentiti prima dello sblocco (App\Support\Chat)
type Preset = { id: string; testo: string };

type Conversation = {
    contact: Contact;
    last_message: string;
    last_message_at: string;
    unread: number;
};

type ApiMessage = {
    id: number;
    sender_id: number;
    body: string;
    created_at: string;
};

const POLL_MS = 4000;

// Aggiornamento periodico solo con la scheda in primo piano (meno richieste, batteria)
function useVisiblePolling(fn: () => void, ms: number, enabled = true) {
    useEffect(() => {
        if (!enabled) return;
        const t = setInterval(() => { if (!document.hidden) fn(); }, ms);
        const onVisible = () => { if (!document.hidden) fn(); };
        document.addEventListener("visibilitychange", onVisible);
        return () => {
            clearInterval(t);
            document.removeEventListener("visibilitychange", onVisible);
        };
    }, [fn, ms, enabled]);
}

function SbloccoCard({ contact, offerta, canSend, onUnlock, unlocking }: {
    contact: Contact;
    offerta: OffertaSblocco;
    canSend: boolean;
    onUnlock: () => void;
    unlocking: boolean;
}) {
    const verde = offerta.badge === "verde";
    const dati = [
        offerta.settore,
        istruzioneLabel(offerta.livello_istruzione),
        offerta.ral_aspettativa,
    ].filter(Boolean);

    return (
        <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-3">
            <div className="flex items-center gap-3">
                <div className="shrink-0 w-12 h-12 rounded-xl bg-white border border-slate-200 flex flex-col items-center justify-center">
                    <span className="text-base font-bold text-slate-900 leading-none">{offerta.rating_tecnico ?? "—"}</span>
                    <span className="text-[9px] text-slate-400">rating</span>
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 flex items-center gap-1.5 flex-wrap">
                        {contact.first_name}
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${verde ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-600"}`}>
                            {verde ? "✓ Certificato" : "Dichiarato"}
                        </span>
                        {!!offerta.rating_reputazionale && offerta.rating_reputazionale > 0 && (
                            <span className="text-[11px] text-amber-600 font-semibold">★ {offerta.rating_reputazionale}</span>
                        )}
                    </p>
                    {dati.length > 0 && <p className="text-[11px] text-slate-500 truncate">{dati.join(" · ")}</p>}
                </div>
            </div>
            <button
                onClick={onUnlock}
                disabled={unlocking}
                className="mt-3 w-full py-2.5! bg-blue-600 text-white text-sm font-semibold rounded-xl! border-0! hover:bg-blue-700 disabled:opacity-60"
            >
                {unlocking
                    ? "Sblocco in corso…"
                    : `${canSend ? "Sblocca nome e contatti" : "Sblocca e scrivi liberamente"} · €${euro(offerta.prezzo)}`}
            </button>
            <p className="mt-1.5 text-[10px] text-slate-400 text-center">
                Nome, foto, contatti, curriculum completo e chat libera per 30 giorni
            </p>
        </div>
    );
}

// Su mobile la conversazione è a schermo intero e segue l'area visibile
// (si restringe quando si apre la tastiera)
function useMobileViewport() {
    const [state, setState] = useState(() => ({
        isMobile: window.matchMedia("(max-width: 767px)").matches,
        height: window.visualViewport?.height ?? window.innerHeight,
        top: window.visualViewport?.offsetTop ?? 0,
    }));

    useEffect(() => {
        const mq = window.matchMedia("(max-width: 767px)");
        const vv = window.visualViewport;
        const update = () => setState({
            isMobile: mq.matches,
            height: vv?.height ?? window.innerHeight,
            top: vv?.offsetTop ?? 0,
        });
        mq.addEventListener("change", update);
        vv?.addEventListener("resize", update);
        vv?.addEventListener("scroll", update);
        window.addEventListener("resize", update);
        return () => {
            mq.removeEventListener("change", update);
            vv?.removeEventListener("resize", update);
            vv?.removeEventListener("scroll", update);
            window.removeEventListener("resize", update);
        };
    }, []);

    return state;
}

function formatTime(iso: string) {
    const d = new Date(iso);
    const today = new Date();
    return d.toDateString() === today.toDateString()
        ? d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })
        : d.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit" });
}

function fullName(c: Contact) {
    return c.last_name ? `${c.first_name} ${c.last_name}` : c.first_name;
}

function Avatar({ contact, size }: { contact: Contact; size: string }) {
    if (contact.profile_image) {
        return (
            <img
                src={`/storage/${contact.profile_image}`}
                alt={contact.first_name}
                className={`${size} rounded-full object-cover shrink-0`}
            />
        );
    }
    const initials = `${contact.first_name[0] ?? ""}${contact.last_name?.[0] ?? ""}`.toUpperCase();
    return (
        <div className={`${size} rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm shrink-0`}>
            {initials}
        </div>
    );
}

export default function ChatPage() {
    const { user } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
    const [showChatOnMobile, setShowChatOnMobile] = useState(false);
    const [message, setMessage] = useState("");
    const [messages, setMessages] = useState<ApiMessage[]>([]);
    const [canSend, setCanSend] = useState(false);
    const [canChat, setCanChat] = useState(true);
    const [preset, setPreset] = useState<Preset[]>([]);
    const [offerta, setOfferta] = useState<OffertaSblocco | null>(null);
    const [unlocking, setUnlocking] = useState(false);
    const [notice, setNotice] = useState("");
    const [sending, setSending] = useState(false);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const messagesRef = useRef<HTMLDivElement>(null);
    const viewport = useMobileViewport();
    // Su telefono "indietro" torna dalla conversazione all'elenco
    useBackClose(viewport.isMobile && showChatOnMobile, () => setShowChatOnMobile(false));

    useEffect(() => {
        document.body.style.overflow = "hidden";
        return () => { document.body.style.overflow = ""; };
    }, []);

    const loadConversations = useCallback(async () => {
        try {
            const res = await axiosClient.get("/api/conversations");
            setConversations(res.data);
        } catch (err) {
            console.error("Errore caricamento conversazioni:", err);
        }
    }, []);

    const loadMessages = useCallback(async (contactId: number) => {
        try {
            const res = await axiosClient.get(`/api/messages/${contactId}`);
            setSelectedContact(res.data.contact);
            // Non sovrascrivo i messaggi inviati e non ancora confermati
            setMessages((prev) => [...res.data.messages, ...prev.filter((m) => m.id < 0)]);
            setCanSend(res.data.can_send);
            setCanChat(res.data.can_chat ?? true);
            setPreset(res.data.preset ?? []);
            setOfferta(res.data.sblocco ?? null);
        } catch (err) {
            console.error("Errore caricamento messaggi:", err);
        }
    }, []);

    // Conversazioni: caricamento iniziale + aggiornamento periodico
    useEffect(() => { loadConversations(); }, [loadConversations]);
    useVisiblePolling(loadConversations, POLL_MS * 2);

    // Apertura diretta da profilo o notifica: /chat?to=ID (anche al ritorno da Stripe)
    useEffect(() => {
        const to = Number(searchParams.get("to"));
        if (to) {
            confermaRitornoStripe().then((pagato) => {
                if (pagato) setNotice("Profilo sbloccato: ora puoi rispondere.");
                loadMessages(to);
                loadConversations();
            });
            setShowChatOnMobile(true);
            setSearchParams({}, { replace: true });
        }
    }, [searchParams, setSearchParams, loadMessages, loadConversations]);

    // Messaggi della conversazione aperta: aggiornamento periodico
    const selectedId = selectedContact?.id;
    const pollMessages = useCallback(() => { if (selectedId) loadMessages(selectedId); }, [selectedId, loadMessages]);
    useVisiblePolling(pollMessages, POLL_MS, !!selectedId);

    const handleUnlock = async () => {
        if (!selectedContact) return;
        setUnlocking(true);
        setError("");
        try {
            const fatto = await avviaSblocco(selectedContact.id, "chat");
            if (fatto) {
                await loadMessages(selectedContact.id);
                loadConversations();
                setNotice(avvisoSblocco(fatto, "ora puoi scrivere liberamente"));
            }
        } catch (err) {
            setError(messaggioErrore(err));
        } finally {
            setUnlocking(false);
        }
    };

    useEffect(() => {
        if (!notice) return;
        const t = setTimeout(() => setNotice(""), 5000);
        return () => clearTimeout(t);
    }, [notice]);

    // Scorre solo il contenitore dei messaggi: scrollIntoView spostava tutta la pagina
    useEffect(() => {
        const el = messagesRef.current;
        if (el) el.scrollTop = el.scrollHeight;
    }, [messages.length, selectedId, viewport.height]);

    const filteredConversations = conversations.filter(c =>
        fullName(c.contact).toLowerCase().includes(search.toLowerCase())
    );

    const handleSelectContact = (contact: Contact) => {
        setError("");
        setNotice("");
        setMessages([]);
        setOfferta(null);
        setPreset([]);
        setSelectedContact(contact);
        setShowChatOnMobile(true);
        // Il contatore dei non letti si azzera subito, senza aspettare il server
        setConversations((prev) => prev.map((c) => (c.contact.id === contact.id ? { ...c, unread: 0 } : c)));
        loadMessages(contact.id).then(loadConversations);
    };

    // Invio ottimistico: il messaggio compare subito, il server lo conferma dopo
    const invia = async (testo: string, payload: { body?: string; preset?: string }) => {
        if (!selectedContact || sending) return;
        const tempId = -Date.now();
        setSending(true);
        setError("");
        if (payload.body) setMessage("");
        setMessages((prev) => [...prev, { id: tempId, sender_id: user!.id, body: testo, created_at: new Date().toISOString() }]);
        try {
            const res = await axiosClient.post(`/api/messages/${selectedContact.id}`, payload);
            // Se un aggiornamento periodico l'ha già portato, tengo una sola copia
            setMessages((prev) => prev.filter((m) => m.id !== res.data.id).map((m) => (m.id === tempId ? res.data : m)));
            loadConversations();
        } catch (err: any) {
            setMessages((prev) => prev.filter((m) => m.id !== tempId));
            if (payload.body) setMessage(payload.body);
            setError(err?.response?.data?.message ?? "Errore durante l'invio del messaggio.");
        } finally {
            setSending(false);
        }
    };

    const handleSend = () => {
        const body = message.trim();
        if (body) invia(body, { body });
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const mobileFullscreen = viewport.isMobile && showChatOnMobile;

    return (
        // Altezza = viewport meno i padding di MainLayout (pt-20 + pb-24 mobile, pt-20 + pb-8 desktop)
        <div className="flex h-[calc(100dvh-176px)] md:h-[calc(100dvh-112px)] bg-white rounded-2xl shadow-sm overflow-hidden border border-slate-200">

            {/* Sidebar Contatti */}
            <div className={`w-full md:w-80 border-r border-slate-100 flex flex-col ${showChatOnMobile ? "hidden md:flex" : "flex"}`}>

                {/* Header sidebar */}
                <div className="p-4 border-b border-slate-100">
                    <h2 className="text-lg font-bold text-slate-900 mb-3">Messaggi</h2>
                    <div className="relative">
                        <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Cerca conversazione..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full bg-slate-100 rounded-xl py-2 pl-9 pr-4 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition-colors"
                        />
                    </div>
                </div>

                {/* Lista contatti */}
                <div className="flex-1 overflow-y-auto">
                    {filteredConversations.length === 0 && (
                        <p className="p-4 text-sm text-slate-400">
                            Nessuna conversazione. Apri un profilo e premi "Scrivi un messaggio".
                        </p>
                    )}
                    {filteredConversations.map(({ contact, last_message, last_message_at, unread }) => (
                        <div
                            key={contact.id}
                            onClick={() => handleSelectContact(contact)}
                            className={`px-4 py-3 flex items-center gap-3 cursor-pointer transition-colors ${
                                selectedContact?.id === contact.id ? "bg-blue-50" : "hover:bg-slate-50"
                            }`}
                        >
                            <Avatar contact={contact} size="w-12 h-12" />
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-semibold text-slate-900 truncate">
                                        {fullName(contact)}
                                    </span>
                                    <span className="text-[10px] text-slate-400 shrink-0 ml-2">{formatTime(last_message_at)}</span>
                                </div>
                                <div className="flex justify-between items-center mt-0.5">
                                    <p className="text-xs text-slate-500 truncate">{last_message}</p>
                                    {unread > 0 && (
                                        <span className="ml-2 bg-blue-600 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center shrink-0">
                                            {unread}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Area Messaggi */}
            <div
                className={`${showChatOnMobile ? "flex" : "hidden"} md:flex flex-1 flex-col min-w-0 bg-white ${
                    mobileFullscreen ? "fixed inset-x-0 z-[60]" : ""
                }`}
                style={mobileFullscreen ? { top: viewport.top, height: viewport.height } : undefined}
            >
                {selectedContact ? (
                    <>
                        {/* Header chat */}
                        <div className="shrink-0 px-4 py-3 border-b border-slate-100 flex items-center gap-3 bg-white">
                            <button
                                onClick={() => setShowChatOnMobile(false)}
                                className="md:hidden p-1! -ml-1 border-0! bg-transparent text-slate-400 hover:text-slate-600"
                                aria-label="Torna alle conversazioni"
                            >
                                <ChevronLeftIcon className="w-6 h-6" />
                            </button>
                            <Avatar contact={selectedContact} size="w-10 h-10" />
                            <div className="flex-1 min-w-0">
                                <Link to={profilePath(selectedContact)} className="block truncate font-semibold text-slate-900 text-sm hover:underline">
                                    {fullName(selectedContact)}
                                </Link>
                                <p className="text-xs text-slate-400">{roleLabel(selectedContact.role)}</p>
                            </div>
                        </div>

                        {/* Messaggi */}
                        <div ref={messagesRef} className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 space-y-3 bg-slate-50/30">
                            {messages.map((msg) => (
                                <ChatMessage
                                    key={msg.id}
                                    msg={{
                                        senderId: msg.sender_id === user?.id ? 0 : msg.sender_id,
                                        text: msg.body,
                                        time: formatTime(msg.created_at),
                                    }}
                                />
                            ))}
                        </div>

                        {/* Input */}
                        <div className="shrink-0 p-3 bg-white border-t border-slate-100 space-y-2">
                            {notice && <p className="text-xs text-green-700 font-medium">{notice}</p>}
                            {error && <p className="text-xs text-red-500">{error}</p>}
                            {offerta && (
                                <SbloccoCard
                                    contact={selectedContact}
                                    offerta={offerta}
                                    canSend={canSend}
                                    onUnlock={handleUnlock}
                                    unlocking={unlocking}
                                />
                            )}
                            {canSend ? (
                                <div className="flex items-center gap-2 bg-slate-100 px-3 py-2 rounded-2xl">
                                    <input
                                        type="text"
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        placeholder="Scrivi un messaggio..."
                                        className="flex-1 min-w-0 bg-transparent border-none focus:ring-0 text-base md:text-sm outline-none"
                                    />
                                    <button
                                        onClick={handleSend}
                                        disabled={!message.trim() || sending}
                                        className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-40 shrink-0"
                                    >
                                        <PaperAirplaneIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : preset.length > 0 ? (
                                <div className="space-y-1.5">
                                    <p className="text-[11px] text-slate-400">
                                        Prima dello sblocco si possono inviare solo messaggi preimpostati.
                                    </p>
                                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                                        {preset.map((p) => (
                                            <button
                                                key={p.id}
                                                onClick={() => invia(p.testo, { preset: p.id })}
                                                disabled={sending}
                                                className="shrink-0 max-w-[260px] text-left px-3! py-2! rounded-2xl! border! border-blue-200! bg-white text-xs text-blue-700 hover:bg-blue-50 disabled:opacity-50 whitespace-normal"
                                            >
                                                {p.testo}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                !offerta && (
                                    <p className="text-xs text-slate-400 text-center py-2">
                                        {canChat
                                            ? "Non puoi scrivere a questo utente."
                                            : "La chat è disponibile solo tra aziende o professionisti e i talenti. Questa conversazione resta in sola lettura."}
                                    </p>
                                )
                            )}
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
                        Seleziona una conversazione
                    </div>
                )}
            </div>
        </div>
    );
}
