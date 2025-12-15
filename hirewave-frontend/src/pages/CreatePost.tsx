import { useState } from "react";
import axiosClient from "../api/axiosClient";
import { useNavigate } from "react-router-dom";

export default function CreatePostPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: "",
    description: "",
    location: "",
    contract_type: "",
    budget: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await axiosClient.post("/api/posts", form);
      navigate("/feed");
    } catch (err: any) {
      setError("Errore nella creazione del post");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="text-black max-w-xl mx-auto bg-white p-6 rounded-2xl shadow-sm">
      <h1 className="text-xl font-semibold mb-4">Crea un nuovo post</h1>

      {error && (
        <div className="mb-3 text-sm text-red-600">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          name="title"
          placeholder="Titolo"
          className="w-full border rounded-lg px-3 py-2 text-sm"
          required
          onChange={handleChange}
        />

        <textarea
          name="description"
          placeholder="Descrizione"
          className="w-full border rounded-lg px-3 py-2 text-sm"
          rows={4}
          onChange={handleChange}
        />

        <input
          name="location"
          placeholder="Località"
          className="w-full border rounded-lg px-3 py-2 text-sm"
          onChange={handleChange}
        />

        <input
          name="contract_type"
          placeholder="Tipo contratto"
          className="w-full border rounded-lg px-3 py-2 text-sm"
          onChange={handleChange}
        />

        <input
          name="budget"
          placeholder="Budget"
          className="w-full border rounded-lg px-3 py-2 text-sm"
          onChange={handleChange}
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-semibold"
        >
          {loading ? "Creazione..." : "Pubblica"}
        </button>
      </form>
    </div>
  );
}
