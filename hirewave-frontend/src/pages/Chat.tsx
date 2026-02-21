import { useState } from "react";
import {
    MagnifyingGlassIcon,
    PaperAirplaneIcon,
    FaceSmileIcon,
    PaperClipIcon,
} from "@heroicons/react/24/outline";
import { ChatMessage } from "../components/ChatMessage";

const MOCK_CONTACTS = [
    {
        id: 1,
        name: "Mario Rossi",
        lastMessage: "Ciao, ho visto il tuo annuncio...",
        time: "10:30",
        avatar: "MR",
        online: true,
    },
    {
        id: 2,
        name: "Luigi Bianchi",
        lastMessage: "Va bene per domani alle 15?",
        time: "Ieri",
        avatar: "LB",
        online: false,
    },
    {
        id: 3,
        name: "Anna Verga",
        lastMessage: "Grazie mille!",
        time: "Lun",
        avatar: "AV",
        online: true,
    },
];

const MOCK_MESSAGES = [
    {
        id: 1,
        senderId: 1,
        text: "Ciao! Ho visto l'annuncio per il lavoro a Milano.",
        time: "10:25",
    },
    {
        id: 2,
        senderId: 0,
        text: "Ciao Mario, piacere! Dimmi pure, hai già esperienza in quel settore?",
        time: "10:28",
    },
    {
        id: 3,
        senderId: 1,
        text: "Sì, lavoro come magazziniere da circa 3 anni.",
        time: "10:30",
    },
];

export default function ChatPage() {
    const [selectedContact, setSelectedContact] = useState(MOCK_CONTACTS[0]);
    const [message, setMessage] = useState("");

    return (
        <div className="flex h-[calc(100vh-120px)] bg-white rounded-2xl shadow-sm overflow-hidden border border-slate-200">
            {/* Sidebar Contatti */}
            <div className="w-full md:w-80 border-r border-slate-100 flex flex-col p-0">
                <div className="relative">
                    <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Cerca chat..."
                        className="w-full bg-slate-50 border-none rounded-xl py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-blue-500/20"
                    />
                </div>

                <div className="flex-1 overflow-y-auto">
                    {MOCK_CONTACTS.map((contact) => (
                        <div
                            key={contact.id}
                            onClick={() => setSelectedContact(contact)}
                            className={`p-4 flex items-center gap-3 cursor-pointer transition-colors ${
                                selectedContact.id === contact.id
                                    ? "bg-blue-50"
                                    : "hover:bg-slate-50"
                            }`}
                        >
                            <div className="relative">
                                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                                    {contact.avatar}
                                </div>
                                {contact.online && (
                                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start mb-1">
                                    <h3 className="font-semibold text-slate-900 truncate">
                                        {contact.name}
                                    </h3>
                                    <span className="text-[10px] text-slate-400 whitespace-nowrap">
                                        {contact.time}
                                    </span>
                                </div>
                                <p className="text-sm text-slate-500 truncate">
                                    {contact.lastMessage}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Area Messaggi */}
            <div className="hidden md:flex flex-1 flex-col">
                {/* Header Chat */}
                <div className="p-4 border-b border-slate-50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
                            {selectedContact.avatar}
                        </div>
                        <div>
                            <h2 className="font-semibold text-slate-900">
                                {selectedContact.name}
                            </h2>
                            <p className="text-xs text-green-500">
                                {selectedContact.online ? "Online" : "Offline"}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Messaggi */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50">
                    {MOCK_MESSAGES.map((msg) => (
                        <ChatMessage msg={msg} />
                    ))}
                </div>

                {/* Input Messaggio */}
                <div className="p-4 bg-white border-t border-slate-50">
                    <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-2xl">
                        <button className="p-2 text-slate-400 hover:text-slate-600">
                            <PaperClipIcon className="w-5 h-5" />
                        </button>
                        <input
                            type="text"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Scrivi un messaggio..."
                            className="flex-1 bg-transparent border-none focus:ring-0 text-sm py-2"
                        />
                        <button className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors">
                            <PaperAirplaneIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
