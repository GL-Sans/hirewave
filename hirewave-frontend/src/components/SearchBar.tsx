import {
    MagnifyingGlassIcon,
    AdjustmentsHorizontalIcon,
} from "@heroicons/react/24/outline";

type SearchBarProps = {
    placeholder?: string;
    onSearch?: (query: string) => void;
    // Pulsante filtri: mostra/nasconde i filtri della pagina
    onToggleFilters?: () => void;
    filtersOpen?: boolean;
    activeFilters?: number;
};

export default function SearchBar({ placeholder = "Cerca...", onSearch, onToggleFilters, filtersOpen, activeFilters = 0 }: SearchBarProps) {
    return (
        <div className="flex gap-2">
            <div className="flex-1 bg-slate-100 rounded-xl flex items-center px-4 py-2.5 border border-transparent focus-within:border-blue-200 focus-within:bg-white transition-colors">
                <MagnifyingGlassIcon className="w-5 h-5 text-slate-400 mr-2 shrink-0" />
                <input
                    type="text"
                    placeholder={placeholder}
                    onChange={(e) => onSearch?.(e.target.value)}
                    className="bg-transparent text-sm w-full outline-none text-slate-700 placeholder:text-slate-400"
                />
            </div>
            {onToggleFilters && (
                <button
                    type="button"
                    onClick={onToggleFilters}
                    aria-label={filtersOpen ? "Nascondi filtri" : "Mostra filtri"}
                    aria-pressed={filtersOpen}
                    className={`relative px-3 rounded-xl transition-colors shrink-0 ${
                        filtersOpen ? "bg-blue-600 text-white" : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                    }`}
                >
                    <AdjustmentsHorizontalIcon className="w-5 h-5" />
                    {activeFilters > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                            {activeFilters}
                        </span>
                    )}
                </button>
            )}
        </div>
    );
}
