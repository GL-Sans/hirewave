export default function TalentsPage() {
  // versione mock, poi collegherai alle API
  const talents = [
    { id: 1, name: "Marco Rossi", role: "Cameriere extra", location: "Pescara" },
    { id: 2, name: "Sara Bianchi", role: "Barista", location: "Chieti" },
    { id: 3, name: "Luca Verdi", role: "Sviluppatore React", location: "Remoto" },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Talenti</h1>
        <p className="text-sm text-slate-500">
          Una preview dei profili disponibili sulla piattaforma.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        {talents.map((t) => (
          <div
            key={t.id}
            className="bg-white rounded-2xl shadow-sm p-4 flex flex-col gap-1"
          >
            <span className="font-semibold text-sm text-slate-900">
              {t.name}
            </span>
            <span className="text-xs text-slate-600">{t.role}</span>
            <span className="text-xs text-slate-400">{t.location}</span>
          </div>
        ))}
      </div>
    </div>
  );
}