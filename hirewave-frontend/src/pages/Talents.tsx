import { useEffect, useState } from "react";
import axiosClient from "../api/axiosClient";
import { Link } from "react-router-dom";

type Talent = {
  id: number;
  name: string;
  role: string;
};

export default function TalentsPage() {
  const [talents, setTalents] = useState<Talent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axiosClient
      .get("/api/talents")
      .then(res => setTalents(res.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Caricamento talenti...</p>;

  return (
    <div className="space-y-4">
      {talents.map(talent => (
      <Link to={`/profile/${talent.name}`}>
        <div
          key={talent.id}
          className="mb-4 text-gray-600 border rounded-lg p-4 bg-white shadow-sm"
        >
          <h3 className="font-semibold">{talent.name}</h3>
          <p className="text-sm text-slate-600">{talent.role}</p>
        </div>
      </Link>
      ))}
    </div>
  );
}