// Link pubblico di un post: /feed?post=ID apre il feed e lo evidenzia
export function postShareUrl(postId: number) {
    return `${window.location.origin}/feed?post=${postId}`;
}

// Il menu di condivisione nativo esiste solo su HTTPS (non su http://IP-di-rete)
export function canNativeShare() {
    return typeof navigator !== "undefined" && typeof navigator.share === "function";
}

export async function nativeShare(title: string, text: string, url: string) {
    try {
        await navigator.share({ title, text, url });
        return true;
    } catch {
        return false; // annullato dall'utente
    }
}

export async function copyToClipboard(text: string) {
    try {
        await navigator.clipboard.writeText(text);
    } catch {
        // Fallback per contesti non sicuri (http su IP di rete)
        const input = document.createElement("textarea");
        input.value = text;
        input.setAttribute("readonly", "");
        input.style.position = "fixed";
        input.style.opacity = "0";
        document.body.appendChild(input);
        input.select();
        document.execCommand("copy");
        input.remove();
    }
}

// Indirizzi di condivisione delle app più comuni
export function shareTargets(title: string, url: string) {
    const text = `${title} — guarda questa opportunità su HireWave`;
    const e = encodeURIComponent;

    return {
        whatsapp: `https://wa.me/?text=${e(`${text}\n${url}`)}`,
        telegram: `https://t.me/share/url?url=${e(url)}&text=${e(text)}`,
        // "?&body=" funziona sia su Android sia su iOS
        sms: `sms:?&body=${e(`${text} ${url}`)}`,
        email: `mailto:?subject=${e(title)}&body=${e(`${text}\n\n${url}`)}`,
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${e(url)}`,
        x: `https://twitter.com/intent/tweet?text=${e(text)}&url=${e(url)}`,
        linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${e(url)}`,
    };
}
