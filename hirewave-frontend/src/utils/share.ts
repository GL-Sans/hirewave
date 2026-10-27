/**
 * Condivide un post con il menu nativo del telefono; dove non c'è
 * (desktop) copia il link negli appunti. Restituisce cosa è successo.
 */
export async function sharePost(postId: number, title: string): Promise<"shared" | "copied" | "cancelled"> {
    const url = `${window.location.origin}/feed?post=${postId}`;

    if (navigator.share) {
        try {
            await navigator.share({ title, text: `${title} — su HireWave`, url });
            return "shared";
        } catch {
            return "cancelled";
        }
    }

    try {
        await navigator.clipboard.writeText(url);
    } catch {
        // Fallback per contesti non sicuri (http su IP di rete)
        const input = document.createElement("textarea");
        input.value = url;
        document.body.appendChild(input);
        input.select();
        document.execCommand("copy");
        input.remove();
    }
    return "copied";
}
