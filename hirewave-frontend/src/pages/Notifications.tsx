import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    BellIcon,
    BriefcaseIcon,
    ChatBubbleLeftEllipsisIcon,
    LockOpenIcon,
    StarIcon,
    UserPlusIcon,
} from "@heroicons/react/24/outline";
import axiosClient from "../api/axiosClient";
import { useAuth } from "../context/AuthContext";
import { profilePath } from "../utils/profilePath";

type Notification = {
    id: string;
    kind: "message" | "review" | "unlock" | "job_post" | "follow" | null;
    title: string;
    body: string;
    url: string | null;
    read: boolean;
    created_at: string;
};

const ICONS = {
    message: ChatBubbleLeftEllipsisIcon,
    review: StarIcon,
    unlock: LockOpenIcon,
    job_post: BriefcaseIcon,
    follow: UserPlusIcon,
};

function timeAgo(iso: string) {
    const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (minutes < 1) return "adesso";
    if (minutes < 60) return `${minutes} min fa`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} h fa`;
    return `${Math.floor(hours / 24)} g fa`;
}

export default function NotificationsPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [items, setItems] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        try {
            const res = await axiosClient.get("/api/notifications");
            setItems(res.data.notifications);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const notifyNavbar = () => window.dispatchEvent(new Event("notifications:changed"));

    const open = async (n: Notification) => {
        if (!n.read) {
            await axiosClient.post(`/api/notifications/${n.id}/read`).catch(() => {});
            notifyNavbar();
        }
        // "/profile" senza id = il mio profilo
        if (n.url === "/profile" && user) navigate(profilePath(user));
        else if (n.url) navigate(n.url);
        else setItems((prev) => prev.map((i) => (i.id === n.id ? { ...i, read: true } : i)));
    };

    const readAll = async () => {
        await axiosClient.post("/api/notifications/read-all");
        setItems((prev) => prev.map((i) => ({ ...i, read: true })));
        notifyNavbar();
    };

    const unread = items.filter((i) => !i.read).length;

    return (
        <div className="max-w-2xl mx-auto space-y-4">
            <div className="flex items-center justify-between gap-2">
                <h1 className="text-2xl font-bold text-slate-900">Notifiche</h1>
                {unread > 0 && (
                    <button onClick={readAll} className="text-sm text-blue-600 font-semibold border-0! p-0! bg-transparent">
                        Segna tutte come lette
                    </button>
                )}
            </div>

            {!user?.notifications_enabled && (
                <p className="text-sm text-slate-500 bg-white rounded-xl p-3 shadow-sm">
                    Le notifiche sono disattivate: puoi riattivarle dalle Impostazioni.
                </p>
            )}

            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                {loading ? (
                    <p className="p-6 text-sm text-slate-400">Caricamento...</p>
                ) : items.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-sm flex flex-col items-center gap-2">
                        <BellIcon className="w-8 h-8" />
                        Nessuna notifica per ora.
                    </div>
                ) : (
                    <ul className="divide-y divide-slate-100">
                        {items.map((n) => {
                            const Icon = (n.kind && ICONS[n.kind]) || BellIcon;
                            return (
                                <li key={n.id}>
                                    <button
                                        onClick={() => open(n)}
                                        className={`w-full text-left flex gap-3 px-4! py-3! border-0! rounded-none! transition-colors hover:bg-slate-50 ${
                                            n.read ? "bg-transparent" : "bg-blue-50"
                                        }`}
                                    >
                                        <Icon className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm text-slate-900 ${n.read ? "" : "font-semibold"}`}>{n.title}</p>
                                            {n.body && <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">{n.body}</p>}
                                            <p className="text-[11px] text-slate-400 mt-1">{timeAgo(n.created_at)}</p>
                                        </div>
                                        {!n.read && <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0 mt-2" />}
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </div>
    );
}
