import { useEffect, useRef } from "react";

// history.back() è asincrono: un pannello che si apre mentre un altro si chiude
// (es. menu "…" → Modifica) aggiunge il suo passo solo a back completato
let backInCorso = false;
const inAttesa: (() => void)[] = [];

window.addEventListener("popstate", () => {
    if (!backInCorso) return;
    backInCorso = false;
    inAttesa.splice(0).forEach((fn) => fn());
});

function dopoIlBack(fn: () => void) {
    if (backInCorso) inAttesa.push(fn);
    else fn();
}

/**
 * Il tasto/gesto "indietro" del telefono chiude il pannello aperto (chat,
 * finestre, menu) invece di lasciare la pagina: all'apertura si aggiunge un
 * passo alla cronologia con lo stesso indirizzo, e tornando indietro si chiude.
 * Chiudendo dal pulsante il passo aggiunto viene tolto.
 */
export function useBackClose(open: boolean, onClose: () => void) {
    const closeRef = useRef(onClose);
    useEffect(() => {
        closeRef.current = onClose;
    });

    useEffect(() => {
        if (!open) return;
        const marker = Math.random().toString(36).slice(2);
        let pushed = false;
        let chiuso = false;

        const onPop = () => {
            // Ancora sul mio passo: si è chiuso un pannello aperto sopra questo
            if (window.history.state?.hwOverlay === marker) return;
            pushed = false;
            closeRef.current();
        };

        // Rimandato di un tick: in StrictMode l'effetto parte due volte e non deve lasciare passi in più
        const timer = window.setTimeout(() => dopoIlBack(() => {
            if (chiuso) return;
            window.history.pushState({ ...window.history.state, hwOverlay: marker }, "");
            pushed = true;
            window.addEventListener("popstate", onPop);
        }), 0);

        return () => {
            chiuso = true;
            window.clearTimeout(timer);
            window.removeEventListener("popstate", onPop);
            if (pushed && window.history.state?.hwOverlay === marker) {
                backInCorso = true;
                window.history.back();
            }
        };
    }, [open]);
}
