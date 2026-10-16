import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";
import {
    HomeIcon,
    UserGroupIcon,
    BuildingOffice2Icon,
    UserIcon,
    PlusCircleIcon,
    ChatBubbleLeftEllipsisIcon,
    ChevronDownIcon,
    Cog6ToothIcon,
    ArrowRightOnRectangleIcon,
} from "@heroicons/react/24/outline";

// type Props = {
//   onMenuClick: () => void;
// };
// { onMenuClick }: Props #da mettere in Navbar()

export default function Navbar() {
    const { user, logout } = useAuth();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close menu when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (
                menuRef.current &&
                !menuRef.current.contains(event.target as Node)
            ) {
                setIsMenuOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () =>
            document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <header className="fixed top-0 left-0 w-full z-50 bg-white shadow-sm">
            <div className="max-w-5xl mx-auto px-4 py-2 md:py-3">
                <div className="flex items-center justify-between md:gap-6">
                    {/* Hamburger mobiles
        <button
          onClick={onMenuClick}
          className="md:hidden p-2 rounded-full hover:bg-slate-100"
        >
          <Bars3Icon className="w-6 h-6 text-slate-800" />
        </button> */}

                    {/* LOGO  */}
                    <Link to="/feed">
                        <div className="flex items-center gap-2">
                            <div
                                className="w-10 h-10 rounded-xl bg-center bg-no-repeat bg-cover"
                                style={{
                                    backgroundImage: "url('img/favicon.png')",
                                }}
                            />
                        </div>
                    </Link>

                    {/* NAV */}
                    <nav className="fixed bottom-0 left-0 w-full bg-white border-t border-slate-200 py-2 md:py-0 md:border-t-0 md:static flex flex-1 items-center justify-around md:justify-center md:gap-2 z-50">
                        {/* FEED */}
                        <Link
                            to="/feed"
                            className="flex flex-col items-center md:flex-row px-3 py-2 rounded-lg text-xs md:text-sm text-slate-600 hover:text-slate-900"
                        >
                            <HomeIcon className="w-6 h-6 md:hidden" />
                            <span>Feed</span>
                        </Link>

                        {/* TALENTI */}
                        <Link
                            to="/talents"
                            className="flex flex-col items-center md:flex-row px-3 py-2 rounded-lg text-xs md:text-sm text-slate-600 hover:text-slate-900"
                        >
                            <UserGroupIcon className="w-6 h-6 md:hidden" />
                            <span>Talenti</span>
                        </Link>

                        {/* CREA ANNUNCIO */}
                        <Link
                            to="/create"
                            className="flex items-center justify-center md:flex-row border-x border-gray-400 hover:bg-gray-400 hover:text-white text-gray-500 px-3 md:px-4 h-10 rounded-lg text-xs md:text-sm font-semibold"
                        >
                            {/* Icona (mobile) */}
                            <PlusCircleIcon className="w-9 h-9 md:hidden" />

                            {/* Testo (desktop) */}
                            <span className="hidden md:inline">Crea post</span>
                        </Link>

                        {/* AZIENDE */}
                        <Link
                            to="/companies"
                            className="flex flex-col items-center md:flex-row px-3 py-2 rounded-lg text-xs md:text-sm text-slate-600 hover:text-slate-900"
                        >
                            <BuildingOffice2Icon className="w-6 h-6 md:hidden" />
                            <span>Aziende</span>
                        </Link>

                        {/* CHAT */}
                        <Link
                            to="/chat"
                            className="flex flex-col items-center md:flex-row px-3 py-2 rounded-lg text-xs md:text-sm text-slate-600 hover:text-slate-900"
                        >
                            <ChatBubbleLeftEllipsisIcon className="w-6 h-6 md:hidden" />
                            <span>Chat</span>
                        </Link>
                    </nav>

                    {/* UTENTE */}
                    <div className="relative" ref={menuRef}>
                        <div
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 md:pr-2 rounded-full transition-colors border border-transparent hover:border-slate-200"
                        >
                            <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200">
                                {user?.profile_image ? (
                                    <img
                                        src={`/storage/${user.profile_image}`}
                                        alt={`${user.first_name} ${user.last_name}`}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <UserIcon className="w-5 h-5 text-slate-400" />
                                )}
                            </div>
                            <ChevronDownIcon
                                className={`w-4 h-4 text-slate-500 transition-transform ${isMenuOpen ? "rotate-180" : ""}`}
                            />
                        </div>

                        {/* Dropdown Menu */}
                        {isMenuOpen && (
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-100 py-1 z-50 overflow-hidden animate-in fade-in zoom-in duration-200">
                                <Link
                                    to={`/profile/${user?.first_name?.toLowerCase()}-${user?.last_name?.toLowerCase()}`}
                                    onClick={() => setIsMenuOpen(false)}
                                    className="flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                                >
                                    <UserIcon className="w-4 h-4 text-slate-400" />
                                    <span>Profilo</span>
                                </Link>
                                <Link
                                    to="/settings"
                                    onClick={() => setIsMenuOpen(false)}
                                    className="flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                                >
                                    <Cog6ToothIcon className="w-4 h-4 text-slate-400" />
                                    <span>Impostazioni</span>
                                </Link>
                                <hr className="my-1 border-slate-100" />
                                <button
                                    onClick={() => {
                                        setIsMenuOpen(false);
                                        logout();
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                >
                                    <ArrowRightOnRectangleIcon className="w-4 h-4" />
                                    <span>Logout</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}
