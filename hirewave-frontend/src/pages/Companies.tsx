import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axiosClient from "../api/axiosClient";

type Company = {
  id: number;
  name: string;
  location: string;
};

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    axiosClient
      .get("/api/companies")
      .then(res => setCompanies(res.data))
      .catch(() => setError("Errore nel caricamento delle aziende"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Caricamento aziende...</p>;
  if (error) return <p className="text-red-600">{error}</p>;
  if (!companies.length) return <p className="text-slate-500">Nessuna azienda trovata</p>;

  return (
    <div className="space-y-4">
      {companies.map(company => (
      <Link to={`/profile/${company.id}`}>
        <div
          key={company.id}
          className="text-gray-600 border rounded-lg p-4 bg-white shadow-sm"
        >
          <h3 className="font-semibold">{company.name}</h3>
          <p className="text-sm">{company.location}</p>
        </div>
      </Link>
      ))}
    </div>
  );
}
