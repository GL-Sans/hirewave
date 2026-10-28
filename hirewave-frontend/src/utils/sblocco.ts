import axiosClient from "../api/axiosClient";

type Ritorno = "talents" | "profile" | "chat";

/**
 * Avvia lo sblocco di un profilo. Con Stripe porta al checkout; in modalità
 * demo lo sblocco è già fatto e restituisce true, così la pagina si aggiorna
 * da sola senza ricaricarsi.
 */
export async function avviaSblocco(workerId: number, ritorno: Ritorno): Promise<boolean> {
    const res = await axiosClient.post("/api/stripe/checkout", { worker_id: workerId, ritorno });
    if (res.data.demo) return true;
    if (res.data.url) window.location.href = res.data.url;
    return false;
}

/** Al ritorno da Stripe: conferma il pagamento e pulisce l'indirizzo */
export async function confermaRitornoStripe(): Promise<boolean> {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    if (!sessionId) return false;
    params.delete("session_id");
    const rest = params.toString();
    window.history.replaceState(null, "", window.location.pathname + (rest ? `?${rest}` : ""));
    try {
        await axiosClient.post("/api/stripe/confirm", { session_id: sessionId });
        return true;
    } catch (err) {
        console.error("Errore conferma pagamento:", err);
        return false;
    }
}

export function messaggioErrore(err: any, fallback = "Errore durante l'avvio del pagamento.") {
    return err?.response?.data?.message ?? fallback;
}
