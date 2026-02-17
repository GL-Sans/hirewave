import { useState, useRef } from "react";
import axiosClient from "../api/axiosClient";
import { useNavigate } from "react-router-dom";
import { CameraIcon } from "@heroicons/react/24/outline";

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
    const [dragActive, setDragActive] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setSelectedFile(e.dataTransfer.files[0]);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const onButtonClick = () => {
        inputRef.current?.click();
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
            {/* <h1 className="text-xl font-semibold mb-4">Crea un nuovo post</h1> */}

            {error && <div className="mb-3 text-sm text-red-600">{error}</div>}

            <form onSubmit={handleSubmit} className="space-y-3">
                <div
                    className={`relative border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center cursor-pointer transition-colors ${
                        dragActive
                            ? "border-blue-500 bg-blue-50"
                            : "border-blue-300 bg-blue-50 hover:bg-blue-100"
                    }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={onButtonClick}
                >
                    <CameraIcon className="w-12 h-12 text-blue-500 mb-2" />
                    <p className="text-sm text-gray-600">
                        {selectedFile
                            ? selectedFile.name
                            : "Trascina e rilascia una foto qui o clicca per caricare"}
                    </p>
                    <input
                        ref={inputRef}
                        type="file"
                        id="photo"
                        name="photo"
                        className="hidden"
                        onChange={handleFileChange}
                        accept="image/*"
                    />
                </div>

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
