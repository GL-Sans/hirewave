/**
 * Blocca lo zoom della pagina con il pizzico, su telefono e su trackpad.
 * Safari iOS ignora user-scalable=no del meta viewport, quindi serve anche
 * annullare i suoi eventi "gesture"; touch-action in index.css copre il resto.
 */
export function disableZoom() {
    const prevent = (e: Event) => e.preventDefault();

    // Safari iOS: pizzico
    document.addEventListener("gesturestart", prevent, { passive: false });
    document.addEventListener("gesturechange", prevent, { passive: false });
    document.addEventListener("gestureend", prevent, { passive: false });

    // Due o più dita sullo schermo = pizzico
    document.addEventListener(
        "touchmove",
        (e) => {
            if (e.touches.length > 1) e.preventDefault();
        },
        { passive: false },
    );

    // Il doppio tocco è bloccato da touch-action in index.css: bloccarlo qui
    // annullerebbe anche i tocchi rapidi sui pulsanti

    // Pizzico sul trackpad del computer (arriva come rotella con Ctrl)
    document.addEventListener(
        "wheel",
        (e) => {
            if (e.ctrlKey) e.preventDefault();
        },
        { passive: false },
    );
}
