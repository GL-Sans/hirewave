import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";

// A ogni cambio di pagina riparte dall'alto, prima che la pagina venga disegnata:
// l'utente non vede lo scorrimento. Solo il percorso conta (?post=… nel feed resta com'è).
export default function ScrollToTop() {
    const { pathname } = useLocation();

    useLayoutEffect(() => {
        window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }, [pathname]);

    return null;
}
