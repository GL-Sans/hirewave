import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axiosClient from "../api/axiosClient";
import SearchBar from "../components/SearchBar";
import CompanyCard from "../components/CompanyCard";

type Company = {
    id: number;
    first_name: string;
    last_name: string;
    location: string;
};

export default function CompaniesPage() {
    const [companies, setCompanies] = useState<Company[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        axiosClient
            .get("/api/companies")
            .then((res) => setCompanies(res.data))
            .catch(() => setError("Errore nel caricamento delle aziende"))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <p>Caricamento aziende...</p>;
    if (error) return <p className="text-red-600">{error}</p>;
    if (!companies.length)
        return <p className="text-slate-500">Nessuna azienda trovata</p>;

    return (
        <div className="flex flex-col space-y-4 pb-6">
            <SearchBar placeholder="Cerca aziende..." />

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {companies.map((company) => (
                    <CompanyCard
                        key={company.id}
                        id={company.id}
                        firstName={company.first_name}
                        lastName={company.last_name}
                        imageUrl={"img/favicon.png"}
                    />
                ))}
            </div>
        </div>
    );
}
