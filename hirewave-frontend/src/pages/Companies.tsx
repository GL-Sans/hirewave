import ProfileDirectory from "../components/ProfileDirectory";
import { useAuth } from "../context/AuthContext";

export default function CompaniesPage() {
    const { user } = useAuth();

    // Le aziende non seguono altre aziende: il filtro "Seguite" serve solo a lavoratori e professionisti
    const chips = [
        { label: "Tutte", value: "ALL" },
        { label: "Salvate", value: "SAVED" },
        ...(user?.role !== "COMPANY" ? [{ label: "Seguite", value: "FOLLOWED" }] : []),
    ];

    return (
        <ProfileDirectory
            endpoint="/api/companies"
            searchPlaceholder="Cerca aziende..."
            emptyText="Nessuna azienda trovata."
            chips={chips}
        />
    );
}
