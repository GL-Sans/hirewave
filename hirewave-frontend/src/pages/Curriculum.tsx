import { useParams, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useEffect, useState } from "react";
import axiosClient from "../api/axiosClient";
import { profileIdFromParam } from "../utils/profilePath";

export default function CurriculumPage() {
    const { name } = useParams();
    const { user: loggedUser } = useAuth();
    const [profileUser, setProfileUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        bio: "",
        city: "",
        country: "",
        website: "",
        phone: "",
        birth_date: "",
        years_experience: "",
        contract_type: "",
        available: true,
        curriculum_public: false,
        skills: "",
        languages: "",
    });

    const isMyProfile = !name || profileIdFromParam(name) === loggedUser?.id;

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = isMyProfile
                    ? await axiosClient.get("/api/me")
                    : await axiosClient.get(`/api/profile/${name}`);

                const u = res.data.user;
                setProfileUser(u);

                if (isMyProfile) {
                    setForm({
                        bio: u.bio ?? "",
                        city: u.city ?? "",
                        country: u.country ?? "",
                        website: u.website ?? "",
                        phone: u.phone ?? "",
                        birth_date: u.birth_date ?? "",
                        years_experience: u.years_experience ?? "",
                        contract_type: u.contract_type ?? "",
                        available: u.available ?? true,
                        curriculum_public: u.curriculum_public ?? false,
                        skills: u.skills ? u.skills.join(", ") : "",
                        languages: u.languages ? u.languages.join(", ") : "",
                    });
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, [name]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const website = form.website && !form.website.startsWith("http")
                ? `https://${form.website}`
                : form.website;

            await axiosClient.put("/api/me/curriculum", {
                ...form,
                website,
                years_experience: form.years_experience ? parseInt(form.years_experience as string) : null,
                skills: form.skills ? form.skills.split(",").map((s) => s.trim()).filter(Boolean) : [],
                languages: form.languages ? form.languages.split(",").map((l) => l.trim()).filter(Boolean) : [],
            });
            setShowForm(false);
            const res = await axiosClient.get("/api/me");
            setProfileUser(res.data.user);
        } catch (err) {
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <p className="text-black p-4">Caricamento...</p>;
    if (!profileUser) return <p className="text-black p-4">Profilo non trovato</p>;

    // Curriculum privato visto da altri
    if (!isMyProfile && !profileUser.curriculum_public) {
        return (
            <div className="space-y-4">
                <div className="bg-white text-gray-700 rounded-2xl p-4 shadow-sm">
                    <h1 className="text-xl font-semibold">Curriculum</h1>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3 text-gray-700">
                    <div className="flex gap-2">
                        <span className="text-slate-500 text-sm">Nome:</span>
                        <span className="text-sm">{profileUser.first_name} {profileUser.last_name}</span>
                    </div>
                    <p className="text-sm text-slate-400">Questo utente ha scelto di mantenere il curriculum privato.</p>
                    <Link to={`/chat?to=${profileUser.id}`}className="text-sm text-blue-600 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-50 inline-block">
                        Contatta
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="bg-white text-gray-700 rounded-2xl p-4 shadow-sm flex items-center justify-between">
                <h1 className="text-xl font-semibold">Curriculum</h1>
                {isMyProfile && (
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className="text-sm text-blue-600 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-50"
                    >
                        {showForm ? "Annulla" : "Modifica"}
                    </button>
                )}
            </div>

            {/* Form modifica (solo mio profilo) */}
            {isMyProfile && showForm && (
                <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3 text-gray-700">
                    <h2 className="font-semibold text-gray-600">Modifica curriculum</h2>

                    {[
                        { label: "Bio", key: "bio", type: "textarea" },
                        { label: "Città", key: "city" },
                        { label: "Paese", key: "country" },
                        { label: "Sito web", key: "website" },
                        { label: "Anni di esperienza", key: "years_experience", type: "number" },
                        { label: "Tipo di contratto", key: "contract_type" },
                        { label: "Skills (separate da virgola)", key: "skills" },
                        { label: "Lingue (separate da virgola)", key: "languages" },
                    ].map(({ label, key, type }) => (
                        <div key={key}>
                            <label className="text-sm text-slate-500 block mb-1">{label}</label>
                            {type === "textarea" ? (
                                <textarea
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                                    rows={3}
                                    value={(form as any)[key]}
                                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                                />
                            ) : (
                                <input
                                    type={type ?? "text"}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                                    value={(form as any)[key]}
                                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                                />
                            )}
                        </div>
                    ))}

                    <div>
                        <label className="text-sm text-slate-500 block mb-1">Telefono (visibile alle aziende che sbloccano il tuo profilo)</label>
                        <input
                            type="text"
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                            value={form.phone}
                            onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        />
                    </div>

                    <p className="text-xs text-slate-400 pt-1">Visibili solo a te 🔒</p>
                    {[
                        { label: "Data di nascita", key: "birth_date", type: "date" },
                    ].map(({ label, key, type }) => (
                        <div key={key}>
                            <label className="text-sm text-slate-500 block mb-1">{label} 🔒</label>
                            <input
                                type={type ?? "text"}
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                                value={(form as any)[key]}
                                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                            />
                        </div>
                    ))}

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={form.available}
                            onChange={(e) => setForm({ ...form, available: e.target.checked })}
                        />
                        <label className="text-sm text-slate-500">Disponibile a nuove opportunità</label>
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={form.curriculum_public}
                            onChange={(e) => setForm({ ...form, curriculum_public: e.target.checked })}
                        />
                        <label className="text-sm text-slate-500">Rendi il curriculum pubblico (mostra anche la tua email)</label>
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="w-full bg-blue-600 text-white rounded-lg py-2 text-sm font-semibold hover:bg-blue-700"
                    >
                        {saving ? "Salvataggio..." : "Salva"}
                    </button>
                </div>
            )}

            {/* Dati pubblici */}
            <div className="bg-white rounded-2xl p-4 shadow-sm space-y-2 text-gray-700">
                <div className="flex gap-2">
                    <span className="text-slate-500 text-sm">Nome:</span>
                    <span className="text-sm">{profileUser.first_name} {profileUser.last_name}</span>
                </div>
                {profileUser.email && profileUser.curriculum_public && (
                    <div className="flex gap-2">
                        <span className="text-slate-500 text-sm">Email:</span>
                        <a href={`mailto:${profileUser.email}`} className="text-sm text-blue-600">{profileUser.email}</a>
                    </div>
                )}
                {profileUser.bio && (
                    <div className="flex gap-2">
                        <span className="text-slate-500 text-sm">Bio:</span>
                        <span className="text-sm">{profileUser.bio}</span>
                    </div>
                )}
                {profileUser.city && (
                    <div className="flex gap-2">
                        <span className="text-slate-500 text-sm">Città:</span>
                        <span className="text-sm">{profileUser.city}{profileUser.country ? `, ${profileUser.country}` : ""}</span>
                    </div>
                )}
                {profileUser.website && (
                    <div className="flex gap-2">
                        <span className="text-slate-500 text-sm">Sito:</span>
                        <a href={profileUser.website} target="_blank" className="text-sm text-blue-600">{profileUser.website}</a>
                    </div>
                )}
                {profileUser.years_experience && (
                    <div className="flex gap-2">
                        <span className="text-slate-500 text-sm">Esperienza:</span>
                        <span className="text-sm">{profileUser.years_experience} anni</span>
                    </div>
                )}
                {profileUser.contract_type && (
                    <div className="flex gap-2">
                        <span className="text-slate-500 text-sm">Contratto:</span>
                        <span className="text-sm">{profileUser.contract_type}</span>
                    </div>
                )}
                {profileUser.skills?.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                        <span className="text-slate-500 text-sm">Skills:</span>
                        {profileUser.skills.map((s: string) => (
                            <span key={s} className="text-xs bg-slate-100 px-2 py-0.5 rounded-full">{s}</span>
                        ))}
                    </div>
                )}
                {profileUser.languages?.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                        <span className="text-slate-500 text-sm">Lingue:</span>
                        {profileUser.languages.map((l: string) => (
                            <span key={l} className="text-xs bg-slate-100 px-2 py-0.5 rounded-full">{l}</span>
                        ))}
                    </div>
                )}
                <div className="flex gap-2">
                    <span className="text-slate-500 text-sm">Disponibile:</span>
                    <span className="text-sm">{profileUser.available ? "Si" : "No"}</span>
                </div>
            </div>

            {/* Dati privati (solo mio profilo) */}
            {isMyProfile && (
                <div className="bg-white rounded-2xl p-4 shadow-sm space-y-2 text-gray-700">
                    {profileUser.phone && (
                        <div className="flex gap-2">
                            <span className="text-slate-500 text-sm">Telefono:</span>
                            <span className="text-sm">{profileUser.phone}</span>
                            <span className="text-xs text-slate-400 self-center">(visibile alle aziende che ti sbloccano)</span>
                        </div>
                    )}
                    <p className="text-xs text-slate-400">Visibili solo a te 🔒</p>
                    {profileUser.birth_date && (
                        <div className="flex gap-2">
                            <span className="text-slate-500 text-sm">Data di nascita:</span>
                            <span className="text-sm">{profileUser.birth_date}</span>
                        </div>
                    )}
                </div>
            )}

            {/* Bottone contatta (profilo altrui) */}
            {!isMyProfile && (
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                    <Link to={`/chat?to=${profileUser.id}`}className="text-sm text-blue-600 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-50 inline-block">
                        Contatta
                    </Link>
                </div>
            )}
        </div>
    );
}