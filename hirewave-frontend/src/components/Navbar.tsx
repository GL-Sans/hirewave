import { MagnifyingGlassIcon, Bars3Icon } from "@heroicons/react/24/outline";
import { useAuth } from "../context/AuthContext";

type Props = {
  onMenuClick: () => void;
};

export default function Navbar({ onMenuClick }: Props) {
  const { user } = useAuth();

  return (
    <header className="fixed top-0 left-0 w-full bg-white shadow-sm z-50">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
        {/* Hamburger mobile */}
        <button
          onClick={onMenuClick}
          className="md:hidden p-2 rounded-full hover:bg-slate-100"
        >
          <Bars3Icon className="w-6 h-6 text-slate-800" />
        </button>

        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-2xl bg-blue-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">HW</span>
          </div>
          <span className="font-semibold text-slate-800 hidden sm:inline">
            HireWave
          </span>
        </div>

        {/* Search */}
        <div className="flex-1">
          <div className="flex items-center gap-2 bg-slate-100 rounded-full px-3 py-1.5">
            <MagnifyingGlassIcon className="w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Cerca opportunità…"
              className="bg-transparent outline-none text-sm flex-1"
            />
          </div>
        </div>

        {/* Utente (desktop) */}
        <div className="hidden md:flex items-center gap-2">
          <span className="text-xs text-slate-500">Ciao,</span>
          <span className="text-sm font-semibold text-slate-800">
            {user?.name ?? "Guest"}
          </span>
        </div>
      </div>
    </header>
  );
}