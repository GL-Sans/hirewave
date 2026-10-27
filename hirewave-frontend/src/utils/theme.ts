export type Theme = "light" | "dark";

const KEY = "theme";

export function getTheme(): Theme {
    try {
        const saved = localStorage.getItem(KEY);
        if (saved === "light" || saved === "dark") return saved;
        // Vecchia chiave usata dalla prima versione delle Impostazioni
        if (localStorage.getItem("darkMode") === "true") return "dark";
    } catch {
        // localStorage non disponibile (es. navigazione privata): tema chiaro
    }
    return "light";
}

export function applyTheme(theme: Theme) {
    document.documentElement.classList.toggle("dark", theme === "dark");
    try {
        localStorage.setItem(KEY, theme);
    } catch {
        // la scelta vale comunque per la sessione corrente
    }
}
