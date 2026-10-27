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

type Contact = {
    id: number;
    first_name: string;
    last_name: string | null;
    role: string;
    profile_image: string | null;
};

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
    const [sending, setSending] = useState(false);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);

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
            setMessages(res.data.messages);
            setCanSend(res.data.can_send);
        } catch (err) {
            console.error("Errore caricamento messaggi:", err);
        }
    }, []);

    // Conversazioni: caricamento iniziale + aggiornamento periodico
    useEffect(() => {
        loadConversations();
        const t = setInterval(loadConversations, POLL_MS * 2);
        return () => clearInterval(t);
    }, [loadConversations]);

    // Apertura diretta da profilo: /chat?to=ID
    useEffect(() => {
        const to = Number(searchParams.get("to"));
        if (to) {
            loadMessages(to);
            setShowChatOnMobile(true);
            setSearchParams({}, { replace: true });
        }
    }, [searchParams, setSearchParams, loadMessages]);

    // Messaggi della conversazione aperta: aggiornamento periodico
    const selectedId = selectedContact?.id;
    useEffect(() => {
        if (!selectedId) return;
        const t = setInterval(() => loadMessages(selectedId), POLL_MS);
        return () => clearInterval(t);
    }, [selectedId, loadMessages]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages.length]);

    const filteredConversations = conversations.filter(c =>
        fullName(c.contact).toLowerCase().includes(search.toLowerCase())
    );

    const handleSelectContact = (contact: Contact) => {
        setError("");
        setMessages([]);
        setSelectedContact(contact);
        setShowChatOnMobile(true);
        loadMessages(contact.id).then(loadConversations);
    };

    const handleSend = async () => {
        if (!message.trim() || !selectedContact || sending) return;
        setSending(true);
        setError("");
        try {
            const res = await axiosClient.post(`/api/messages/${selectedContact.id}`, { body: message });
            setMessages(prev => [...prev, res.data]);
            setMessage("");
            loadConversations();
        } catch (err: any) {
            setError(err?.response?.data?.message ?? "Errore durante l'invio del messaggio.");
        } finally {
            setSending(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const contactProfilePath = (c: Contact) =>
        c.last_name
            ? `/profile/${c.first_name.toLowerCase()}-${c.last_name.toLowerCase()}`
            : `/profile/${c.id}`;

    return (
        <div className="flex h-[calc(100vh-160px)] bg-white rounded-2xl shadow-sm overflow-hidden border border-slate-200">

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
            <div className={`${showChatOnMobile ? "flex" : "hidden"} md:flex flex-1 flex-col`}>
                {selectedContact ? (
                    <>
                        {/* Header chat */}
                        <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3 bg-white">
                            <button
                                onClick={() => setShowChatOnMobile(false)}
                                className="md:hidden p-1 -ml-1 text-slate-400 hover:text-slate-600"
                            >
                                <ChevronLeftIcon className="w-6 h-6" />
                            </button>
                            <Avatar contact={selectedContact} size="w-10 h-10" />
                            <div className="flex-1">
                                <Link to={contactProfilePath(selectedContact)} className="font-semibold text-slate-900 text-sm hover:underline">
                                    {fullName(selectedContact)}
                                </Link>
                                <p className="text-xs text-slate-400 capitalize">{selectedContact.role.toLowerCase()}</p>
                            </div>
                        </div>

                        {/* Messaggi */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/30">
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
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <div className="p-3 bg-white border-t border-slate-100">
                            {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
                            {canSend ? (
                                <div className="flex items-center gap-2 bg-slate-100 px-3 py-2 rounded-2xl">
                                    <input
                                        type="text"
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        placeholder="Scrivi un messaggio..."
                                        className="flex-1 bg-transparent border-none focus:ring-0 text-sm outline-none"
                                    />
                                    <button
                                        onClick={handleSend}
                                        disabled={!message.trim() || sending}
                                        className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-40 shrink-0"
                                    >
                                        <PaperAirplaneIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                <p className="text-xs text-slate-400 text-center py-2">
                                    {user?.role === "COMPANY" && selectedContact.role !== "COMPANY"
                                        ? "Sblocca il profilo per scrivere a questo utente."
                                        : "Non puoi scrivere a questo utente."}
                                </p>
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
