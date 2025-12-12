// src/pages/FeedPage.tsx
import JobCard from "../components/JobCard";

const mockJobs = [
  {
    location: "Pescara",
    timeAgo: "5 ore fa",
    sponsored: true,
    imageUrl: "https://images.pexels.com/photos/1181671/pexels-photo-1181671.jpeg?auto=compress&cs=tinysrgb&w=800",
    title: "Senior React Developer per piattaforma HR-Tech ad alta scalabilità",
    tags: ["React", "TypeScript", "NodeJS"],
    contractType: "Freelance · Progetto",
    budget: "€2.500 - 3.500",
  },
  {
    location: "Chieti",
    timeAgo: "1 giorno fa",
    sponsored: false,
    imageUrl: "https://images.pexels.com/photos/1181263/pexels-photo-1181263.jpeg?auto=compress&cs=tinysrgb&w=800",
    title: "Cameriere extra weekend per stagione estiva",
    tags: ["Extra", "Weekend"],
    contractType: "Tempo determinato",
    budget: "€10-12/ora",
  },
  {
    location: "Montesilvano",
    timeAgo: "6 giorni fa",
    sponsored: false,
    imageUrl: "https://images.pexels.com/photos/1181263/pexels-photo-1181263.jpeg?auto=compress&cs=tinysrgb&w=800",
    title: "Barman per serate in locale sul mare",
    tags: ["Nightlife", "Restaurant"],
    contractType: "Part-time / Determinato",
    budget: "€8-10/ora",
  },
];

export default function FeedPage() {
  return (
    <div className="space-y-4">
      {/* Filtri rapidi */}
      <div className="flex flex-wrap gap-2">
        <button className="px-3 py-1.5 rounded-full bg-slate-900 text-white text-xs font-semibold">
          Solo Passaparola
        </button>
        <button className="px-3 py-1.5 rounded-full border border-slate-300 text-xs text-slate-700">
          Filtri avanzati
        </button>
      </div>

      {/* Lista annunci */}
      <div className="grid md:grid-cols-2 gap-4">
        {mockJobs.map((job) => (
          <JobCard key={job.title} {...job} />
        ))}
      </div>
    </div>
  );
}
