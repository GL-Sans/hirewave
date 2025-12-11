export default function CompaniesPage() {
  const companies = [
    { id: 1, name: "Ristorante MareChiaro", type: "Ristorazione", location: "Pescara" },
    { id: 2, name: "Lido Nettuno", type: "Stabilimento Balneare", location: "Francavilla" },
    { id: 3, name: "TechWave Studio", type: "Agenzia Digital", location: "Remoto" },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Aziende</h1>
        <p className="text-sm text-slate-500">
          Alcune delle realtà con cui HireWave può connettere i talenti.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        {companies.map((c) => (
          <div
            key={c.id}
            className="bg-white rounded-2xl shadow-sm p-4 flex flex-col gap-1"
          >
            <span className="font-semibold text-sm text-slate-900">
              {c.name}
            </span>
            <span className="text-xs text-slate-600">{c.type}</span>
            <span className="text-xs text-slate-400">{c.location}</span>
          </div>
        ))}
      </div>
    </div>
  );
}