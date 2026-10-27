type ProfileRef = {
    id: number;
    first_name?: string | null;
    last_name?: string | null;
};

// L'id nel percorso evita ambiguità tra omonimi: /profile/9-giorgio-sansini
export function profilePath(u: ProfileRef) {
    const slug = [u.first_name, u.last_name]
        .filter(Boolean)
        .join("-")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9-]+/g, "-")
        .replace(/^-+|-+$/g, "");
    // Il nome resta nascosto se il cognome non è visibile
    return u.last_name && slug ? `/profile/${u.id}-${slug}` : `/profile/${u.id}`;
}

// Estrae l'id da un parametro "9-giorgio-sansini" o "9"
export function profileIdFromParam(name?: string) {
    const match = name?.match(/^(\d+)(-|$)/);
    return match ? Number(match[1]) : null;
}
