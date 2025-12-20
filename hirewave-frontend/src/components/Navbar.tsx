// import { Bars3Icon } from "@heroicons/react/24/outline";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";
import {
  HomeIcon,
  UserGroupIcon,
  BuildingOffice2Icon,
  UserIcon,
  PlusCircleIcon,
} from "@heroicons/react/24/outline";

// type Props = {
//   onMenuClick: () => void;
// };
// { onMenuClick }: Props #da mettere in Navbar()

export default function Navbar() {
  const { user } = useAuth();

  return (
    <header
      className="
        fixed left-0 w-full z-50 bg-white shadow-sm
        bottom-0 md:top-0 md:bottom-auto
      "
    >
      <div className="max-w-5xl mx-auto px-4 py-2 md:py-3">
        <div className="flex items-center justify-between md:gap-6">
        {/* Hamburger mobile
        <button
          onClick={onMenuClick}
          className="md:hidden p-2 rounded-full hover:bg-slate-100"
        >
          <Bars3Icon className="w-6 h-6 text-slate-800" />
        </button> */}

        {/* LOGO  */}
        <Link
              to="/feed">
          <div className="hidden md:flex items-center gap-2">
            <div
              className="w-10 h-10 rounded-xl bg-center bg-no-repeat bg-cover"
              style={{ backgroundImage: "url('img/favicon.png')" }}
            />
          </div>
        </Link>

          {/* NAV */}
          <nav className="flex flex-1 items-center justify-around md:justify-center md:gap-2">
            
            {/* FEED */}
            <Link
              to="/feed"
              className="
                flex flex-col items-center
                md:flex-row
                px-3 py-2 rounded-lg
                text-xs md:text-sm
                text-slate-600 hover:text-slate-900
              "
            >
              <HomeIcon className="w-6 h-6 md:hidden" />
              <span>Feed</span>
            </Link>

            {/* TALENTI */}
            <Link
              to="/talents"
              className="
                flex flex-col items-center
                md:flex-row
                px-3 py-2 rounded-lg
                text-xs md:text-sm
                text-slate-600 hover:text-slate-900
              "
            >
              <UserGroupIcon className="w-6 h-6 md:hidden" />
              <span>Talenti</span>
            </Link>

            {/* CREA ANNUNCIO */}
            <Link
              to="/create"
              className="
                flex items-center justify-center
                md:flex-row
                border-x
                border-gray-400
                hover:bg-gray-400 hover:text-white
                text-gray-500
                px-3 md:px-4
                h-10
                rounded-lg
                text-xs md:text-sm
                font-semibold
              "
            >
              {/* Icona (mobile) */}
              <PlusCircleIcon className="w-9 h-9 md:hidden" />

              {/* Testo (desktop) */}
              <span className="hidden md:inline">
                Crea post
              </span>
            </Link>
            
            {/* AZIENDE */}
            <Link
              to="/companies"
              className="
                flex flex-col items-center
                md:flex-row
                px-3 py-2 rounded-lg
                text-xs md:text-sm
                text-slate-600 hover:text-slate-900
              "
            >
              <BuildingOffice2Icon className="w-6 h-6 md:hidden" />
              <span>Aziende</span>
            </Link>

            {/* PROFILO */}
            <Link
              to="/profile"
              className="
                flex flex-col items-center
                md:flex-row
                px-3 py-2 rounded-lg
                text-xs md:text-sm
                text-slate-600 hover:text-slate-900
              "
            >
              <UserIcon className="w-6 h-6 md:hidden" />
              <span>Profilo</span>
            </Link>
          </nav>

          {/* UTENTE (solo desktop) */}
          <div className="hidden md:flex items-center gap-2">
            <span className="text-xs text-slate-500">Ciao,</span>
            <span className="text-sm font-semibold text-slate-800">
              {user?.name ?? "Guest"}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}