import { useState, useRef, useEffect } from "react";
import {
    MagnifyingGlassIcon,
    PaperAirplaneIcon,
    ChevronLeftIcon,
    PhoneIcon,
    EllipsisVerticalIcon,
} from "@heroicons/react/24/outline";
import { ChatMessage } from "../components/ChatMessage";

const MOCK_CONTACTS = [
    { id: 1, first_name: "Marco", last_name: "Ferretti", lastMessage: "Ciao, ho visto il tuo profilo su HireWave!", time: "10:30", avatar: "MF", online: true, unread: 2 },
    { id: 2, first_name: "Sara", last_name: "Conti", lastMessage: "Sono disponibile da giugno", time: "Ieri", avatar: "SC", online: false, unread: 0 },
    { id: 3, first_name: "Luca", last_name: "Marino", lastMessage: "Perfetto, ci sentiamo presto!", time: "Lun", avatar: "LM", online: true, unread: 0 },
    { id: 4, first_name: "Giulia", last_name: "De Luca", lastMessage: "Mando il CV entro stasera", time: "Dom", avatar: "GD", online: false, unread: 1 },
];

const MOCK_MESSAGES_BY_CONTACT: Record<number, any[]> = {
    1: [
        { id: 1, senderId: 1, text: "Ciao! Ho visto il tuo profilo su HireWave, siamo interessati al tuo background.", time: "10:25" },
        { id: 2, senderId: 0, text: "Ciao! Grazie per avermi contattato. Di cosa avreste bisogno esattamente?", time: "10:27" },
        { id: 3, senderId: 1, text: "Cerchiamo un cameriere per la stagione estiva, giugno-settembre. Sei disponibile?", time: "10:28" },
        { id: 4, senderId: 0, text: "Sì, sono libero da fine maggio. Potremmo fare una chiamata questa settimana?", time: "10:29" },
        { id: 5, senderId: 1, text: "Certo! Ti scrivo domani per fissare un orario. Grazie mille!", time: "10:30" },
    ],
    2: [
        { id: 1, senderId: 0, text: "Buongiorno Sara, abbiamo visto il tuo profilo. Sei disponibile per la stagione?", time: "Ieri" },
        { id: 2, senderId: 2, text: "Buongiorno! Sono disponibile da giugno in poi.", time: "Ieri" },
    ],
    3: [
        { id: 1, senderId: 3, text: "Salve, ho ricevuto la vostra proposta. Quando possiamo sentirci?", time: "Lun" },
        { id: 2, senderId: 0, text: "Ottimo! Siamo liberi mercoledì pomeriggio.", time: "Lun" },
        { id: 3, senderId: 3, text: "Perfetto, ci sentiamo presto!", time: "Lun" },
    ],
    4: [
        { id: 1, senderId: 4, text: "Mando il CV entro stasera, grazie!", time: "Dom" },
    ],
};

export default function ChatPage() {
    const [selectedContact, setSelectedContact] = useState<any>(null);
    const [showChatOnMobile, setShowChatOnMobile] = useState(false);
    const [message, setMessage] = useState("");
    const [messages, setMessages] = useState<any[]>([]);
    const [search, setSearch] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        document.body.style.overflow = "hidden";
        return () => { document.body.style.overflow = ""; };
    }, []);

    const filteredContacts = MOCK_CONTACTS.filter(c =>
        `${c.first_name} ${c.last_name}`.toLowerCase().includes(search.toLowerCase())
    );

    const handleSelectContact = (contact: any) => {
        setSelectedContact(contact);
        setMessages(MOCK_MESSAGES_BY_CONTACT[contact.id] || []);
        setShowChatOnMobile(true);
    };

    const handleSend = () => {
        if (!message.trim()) return;
        const newMsg = {
            id: messages.length + 1,
            senderId: 0,
            text: message,
            time: new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }),
        };
        setMessages(prev => [...prev, newMsg]);
        setMessage("");
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

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
                    {filteredContacts.map((contact) => (
                        <div
                            key={contact.id}
                            onClick={() => handleSelectContact(contact)}
                            className={`px-4 py-3 flex items-center gap-3 cursor-pointer transition-colors ${
                                selectedContact?.id === contact.id ? "bg-blue-50" : "hover:bg-slate-50"
                            }`}
                        >
                            <div className="relative shrink-0">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
                                    {contact.avatar}
                                </div>
                                {contact.online && (
                                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-semibold text-slate-900 truncate">
                                        {contact.first_name} {contact.last_name}
                                    </span>
                                    <span className="text-[10px] text-slate-400 shrink-0 ml-2">{contact.time}</span>
                                </div>
                                <div className="flex justify-between items-center mt-0.5">
                                    <p className="text-xs text-slate-500 truncate">{contact.lastMessage}</p>
                                    {contact.unread > 0 && (
                                        <span className="ml-2 bg-blue-600 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center shrink-0">
                                            {contact.unread}
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
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                                {selectedContact.avatar}
                            </div>
                            <div className="flex-1">
                                <h2 className="font-semibold text-slate-900 text-sm">
                                    {selectedContact.first_name} {selectedContact.last_name}
                                </h2>
                                <p className={`text-xs ${selectedContact.online ? "text-green-500" : "text-slate-400"}`}>
                                    {selectedContact.online ? "Online" : "Offline"}
                                </p>
                            </div>
                            <div className="flex gap-1">
                                <button className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors">
                                    <PhoneIcon className="w-5 h-5" />
                                </button>
                                <button className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors">
                                    <EllipsisVerticalIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Messaggi */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/30">
                            {messages.map((msg) => (
                                <ChatMessage key={msg.id} msg={msg} />
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <div className="p-3 bg-white border-t border-slate-100">
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
                                    disabled={!message.trim()}
                                    className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-40 shrink-0"
                                >
                                    <PaperAirplaneIcon className="w-4 h-4" />
                                </button>
                            </div>
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