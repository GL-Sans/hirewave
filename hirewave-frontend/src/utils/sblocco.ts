import axiosClient from "../api/axiosClient";

type Ritorno = "talents" | "profile" | "chat";

/**
 * Avvia lo sblocco di un profilo. Con Stripe porta al checkout e restituisce
 * false; se lo sblocco è già fatto (pagamento demo o sblocco gratuito del
 * lancio) restituisce "demo" o "gratuito", così la pagina si aggiorna da sola.
 */
export async function avviaSblocco(workerId: number, ritorno: Ritorno): Promise<false | "demo" | "gratuito"> {
    const res = await axiosClient.post("/api/stripe/checkout", { worker_id: workerId, ritorno });
    if (res.data.gratuito) return "gratuito";
    if (res.data.demo) return "demo";
    if (res.data.url) window.location.href = res.data.url;
    return false;
}

/** Testo dell'avviso dopo uno sblocco riuscito senza passare da Stripe */
export function avvisoSblocco(esito: "demo" | "gratuito", cosa: string) {
    return esito === "gratuito"
        ? `Profilo sbloccato con uno sblocco gratuito di lancio: ${cosa}.`
        : `Profilo sbloccato (pagamento demo): ${cosa}.`;
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
