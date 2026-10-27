import axiosClient from "../api/axiosClient";
import ProfileDirectory from "../components/ProfileDirectory";

const CHIPS = [
    { label: "Tutti", value: "ALL" },
    { label: "Lavoratori", value: "WORKER" },
    { label: "Professionisti", value: "PRO" },
    { label: "Salvati", value: "SAVED" },
];

// Ritorno dal checkout Stripe: conferma lo sblocco prima di caricare i talenti
async function confirmStripeReturn() {
    const sessionId = new URLSearchParams(window.location.search).get("session_id");
    if (!sessionId) return;
    try {
        await axiosClient.post("/api/stripe/confirm", { session_id: sessionId });
    } catch (err) {
        console.error("Errore conferma pagamento:", err);
    }
    window.history.replaceState(null, "", "/talents");
}

export default function TalentsPage() {
    return (
        <ProfileDirectory
            endpoint="/api/talents"
            searchPlaceholder="Cerca talenti..."
            emptyText="Nessun talento trovato."
            chips={CHIPS}
            beforeLoad={confirmStripeReturn}
        />
    );
}
