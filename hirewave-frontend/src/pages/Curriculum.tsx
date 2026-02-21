import { useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";

export default function CurriculumPage() {
  const { name } = useParams();
  const { user } = useAuth();

  const username = name ?? user?.name;
  const type = name ?? user?.role;

  return (
    <div className="space-y-2">
      <div className="bg-white text-gray-700 rounded-2xl p-4 shadow-sm">
        <h1 className="text-xl font-semibold text-gray-700">Curriculum</h1>
      </div>
      <div className="flex gap-2 px-5 text-gray-700 mt-6">
        <h2>Nome:</h2>
        <h2>{username}</h2>
      </div>
      <div className="flex gap-2 px-5 text-gray-700">
        <h2>Cognome:</h2>
        <h2>""Aggiungere nel DB""</h2>
      </div>
      <div className="flex gap-2 px-5 text-gray-700">
        <h2>Email:</h2>
        <h2><Link to="/chat" >*****</Link></h2>
      </div>
      <div className="flex gap-2 px-5 text-gray-700">
        <h2>Skill:</h2>
        <h2>{type}</h2>
      </div>
    </div>
  );
}