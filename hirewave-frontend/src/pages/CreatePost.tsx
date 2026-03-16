import { useState, useRef, useEffect } from "react";
import axiosClient from "../api/axiosClient";
import { useNavigate } from "react-router-dom";
import { CameraIcon } from "@heroicons/react/24/outline";

export default function CreatePostPage() {
    const navigate = useNavigate();
    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    const [form, setForm] = useState({
        title: "",
        description: "",
        location: "",
        contract_type: "",
        budget: "",
        budget_type: "Ora",
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [dragActive, setDragActive] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    useEffect(() => {
        if (!selectedFile) {
            setPreviewUrl(null);
            return;
        }

        const objectUrl = URL.createObjectURL(selectedFile);
        setPreviewUrl(objectUrl);

        return () => URL.revokeObjectURL(objectUrl);
    }, [selectedFile]);

    const handleChange = (
        e: React.ChangeEvent<
            HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
        >,
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
            const file = e.dataTransfer.files[0];
            if (file.size > MAX_FILE_SIZE) {
                setError("La dimensione massima della foto è 10 MB.");
                return;
            }
            setError(null);
            setSelectedFile(file);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.size > MAX_FILE_SIZE) {
                setError("La dimensione massima della foto è 10 MB.");
                return;
            }
            setError(null);
            setSelectedFile(file);
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
            const formData = new FormData();
            formData.append("title", form.title);
            if (form.description)
                formData.append("description", form.description);
            if (form.location) formData.append("location", form.location);
            if (form.contract_type)
                formData.append("contract_type", form.contract_type);
            if (form.budget) {
                formData.append("budget", form.budget);
                formData.append("budget_type", form.budget_type);
            }
            if (selectedFile) {
                formData.append("image", selectedFile);
            }

            await axiosClient.post("/api/posts", formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            });
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
                    className={`relative border-2 border-dashed rounded-xl overflow-hidden flex flex-col items-center justify-center cursor-pointer transition-all ${
                        dragActive
                            ? "border-blue-500 bg-blue-50"
                            : "border-blue-300 bg-blue-50 hover:bg-blue-100"
                    } ${previewUrl ? "h-64" : "p-10"}`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={onButtonClick}
                >
                    {previewUrl ? (
                        <>
                            <img
                                src={previewUrl}
                                alt="Anteprima post"
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                <CameraIcon className="w-8 h-8 text-white mb-2" />
                                <p className="text-white text-sm font-medium">
                                    Clicca o trascina per cambiare
                                </p>
                            </div>
                        </>
                    ) : (
                        <>
                            <CameraIcon className="w-12 h-12 text-blue-500 mb-2" />
                            <p className="text-sm text-center text-gray-600">
                                Trascina e rilascia una foto qui o clicca per
                                caricare
                            </p>
                        </>
                    )}
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

                <select
                    name="contract_type"
                    className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
                    onChange={handleChange}
                    defaultValue=""
                >
                    <option value="" disabled>
                        Selezione tipo contratto
                    </option>
                    <option value="Contratto a tempo indeterminato">
                        Contratto a tempo indeterminato
                    </option>
                    <option value="Contratto a tempo determinato">
                        Contratto a tempo determinato
                    </option>
                    <option value="Partita IVA">Partita IVA</option>
                    <option value="Apprendistato">Apprendistato</option>
                    <option value="Part-time">Part-time</option>
                    <option value="A chiamata">A chiamata</option>
                </select>

                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500 pointer-events-none">
                            €
                        </span>
                        <input
                            name="budget"
                            type="number"
                            min="0"
                            step="1"
                            placeholder="Budget"
                            className="w-full border rounded-lg pl-8 pr-3 py-2 text-sm"
                            onChange={handleChange}
                            onKeyDown={(e) => {
                                if (
                                    ["e", "E", "+", "-", ".", ","].includes(
                                        e.key,
                                    )
                                ) {
                                    e.preventDefault();
                                }
                            }}
                        />
                    </div>
                    <select
                        name="budget_type"
                        className="border rounded-lg px-3 py-2 text-sm bg-white"
                        onChange={handleChange}
                        value={form.budget_type}
                    >
                        <option value="Ora">Ora</option>
                        <option value="Mensile">Mensile</option>
                        <option value="Fisso">Fisso</option>
                    </select>
                </div>

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
