import { useEffect, useState } from "react";
import axiosClient from "../api/axiosClient";
<<<<<<< HEAD
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
=======
import SearchBar from "../components/SearchBar";
import TalentCard from "../components/TalentCard";

type Talent = {
    id: number;
    first_name: string;
    last_name: string;
    role: string;
    profile_image?: string | null;
};

const MOCK_IMAGES = [
    "https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=800",
    "https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=800",
    "https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=800",
    "https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=800",
    "https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg?auto=compress&cs=tinysrgb&w=800",
    "https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg?auto=compress&cs=tinysrgb&w=800",
];

const MOCK_SKILLS = [
    ["PROJECT MANAGEMENT", "LEAN MANUFACTURING"],
    ["SEO", "DIGITAL STRATEGY", "BRANDING"],
    ["REACT", "TYPESCRIPT", "TAILWIND"],
    ["UI/UX", "FIGMA", "DESIGN SYSTEMS"],
    ["SALES", "B2B", "ACCOUNT MANAGEMENT"],
];

function getImage(id: number) {
    return MOCK_IMAGES[id % MOCK_IMAGES.length];
}

function getSkills(id: number) {
    return MOCK_SKILLS[id % MOCK_SKILLS.length];
}

export default function TalentsPage() {
    const [talents, setTalents] = useState<Talent[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        axiosClient
            .get("/api/talents")
            .then((res) => setTalents(res.data))
            .finally(() => setLoading(false));
    }, []);

    if (loading)
        return <p className="text-slate-500">Caricamento talenti...</p>;

    return (
        <div className="flex flex-col space-y-4 pb-6">
            <SearchBar placeholder="Cerca talenti..." />

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {talents.map((talent) => (
                    <TalentCard
                        key={talent.id}
                        id={talent.id}
                        firstName={talent.first_name}
                        lastName={talent.last_name}
                        role={talent.role}
                        imageUrl={
                            talent.profile_image
                                ? `/storage/${talent.profile_image}`
                                : getImage(talent.id)
                        }
                        skills={getSkills(talent.id)}
                    />
                ))}
            </div>
        </div>
    );
}
>>>>>>> dev_stefano
