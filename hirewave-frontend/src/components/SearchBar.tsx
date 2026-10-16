import {
    MagnifyingGlassIcon,
    AdjustmentsHorizontalIcon,
} from "@heroicons/react/24/outline";
import { useEffect, useRef } from "react";

type SearchBarProps = {
    placeholder?: string;
    onSearch?: (query: string) => void;
};

export default function SearchBar({ placeholder = "Cerca...", onSearch }: SearchBarProps) {
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
            <button className="bg-blue-50 text-blue-600 px-3 rounded-xl hover:bg-blue-100 transition-colors shrink-0">
                <AdjustmentsHorizontalIcon className="w-5 h-5" />
            </button>
        </div>
    );
}