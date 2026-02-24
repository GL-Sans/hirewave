import { XMarkIcon } from "@heroicons/react/24/outline";
import { Link, useLocation } from "react-router-dom";

type Props = {
    open: boolean;
    onClose: () => void;
};

export default function DrawerMenu({ open, onClose }: Props) {
    const location = useLocation();

    if (!open) return null;

    const isActive = (path: string) =>
        location.pathname === path ? "bg-slate-100 font-semibold" : "";

    return (
        <div className="fixed inset-0 z-40 md:hidden">
            <div className="absolute inset-0 bg-black/30" onClick={onClose} />
            <div className="absolute top-0 left-0 h-full w-72 bg-white shadow-lg p-4 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                    <span className="font-semibold text-lg">Menu</span>
                    <button onClick={onClose}>
                        <XMarkIcon className="w-6 h-6 text-slate-700" />
                    </button>
                </div>

                <nav className="flex-1 space-y-1">
                    <Link
                        to="/feed"
                        className={`block px-3 py-2 rounded-lg text-sm text-slate-700 ${isActive(
                            "/feed",
                        )}`}
                        onClick={onClose}
                    >
                        Feed
                    </Link>
                    <Link
                        to="/talents"
                        className={`block px-3 py-2 rounded-lg text-sm text-slate-700 ${isActive(
                            "/talents",
                        )}`}
                        onClick={onClose}
                    >
                        Talenti
                    </Link>
                    <Link
                        to="/companies"
                        className={`block px-3 py-2 rounded-lg text-sm text-slate-700 ${isActive(
                            "/companies",
                        )}`}
                        onClick={onClose}
                    >
                        Aziende
                    </Link>
                </nav>
            </div>
        </div>
    );
}
