import { useParams, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useEffect, useState } from "react";
import axiosClient from "../api/axiosClient";
import { profileIdFromParam } from "../utils/profilePath";
import { ISTRUZIONE_OPTIONS } from "../utils/labels";

// Riga "etichetta: valore" che va a capo su schermi stretti (email e link lunghi inclusi)
function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm">
            <span className="text-slate-500 shrink-0">{label}:</span>
            <span className="min-w-0 break-words [overflow-wrap:anywhere]">{children}</span>
        </div>
    );
}

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
        livello_istruzione: "",
        certificazioni: "",
    });
    const [error, setError] = useState("");

    const isMyProfile = !name || profileIdFromParam(name) === loggedUser?.id;
    const isTalent = loggedUser?.role !== "COMPANY";

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
                        // Il campo data vuole AAAA-MM-GG; il backend invia la data completa ISO
                        birth_date: u.birth_date ? String(u.birth_date).slice(0, 10) : "",
                        years_experience: u.years_experience ?? u.anni_esperienza ?? "",
                        contract_type: u.contract_type ?? "",
                        available: u.available ?? true,
                        curriculum_public: u.curriculum_public ?? false,
                        skills: u.skills ? u.skills.join(", ") : "",
                        languages: u.languages ? u.languages.join(", ") : "",
                        livello_istruzione: u.livello_istruzione ?? "",
                        certificazioni: u.certificazioni ?? "",
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
        setError("");
        try {
            const website = form.website && !form.website.startsWith("http")
                ? `https://${form.website}`
                : form.website;

            const { livello_istruzione, certificazioni, ...rest } = form;
            await axiosClient.put("/api/me/curriculum", {
                ...rest,
                website,
                years_experience: form.years_experience ? parseInt(form.years_experience as string) : null,
                skills: form.skills ? form.skills.split(",").map((s) => s.trim()).filter(Boolean) : [],
                languages: form.languages ? form.languages.split(",").map((l) => l.trim()).filter(Boolean) : [],
                // Dati del rating: solo lavoratori e professionisti
                ...(isTalent ? { livello_istruzione: livello_istruzione || undefined, certificazioni } : {}),
            });
            setShowForm(false);
            const res = await axiosClient.get("/api/me");
            setProfileUser(res.data.user);
        } catch (err: any) {
            console.error(err);
            const errors = err?.response?.data?.errors;
            setError(err?.response?.data?.message ?? (errors ? (Object.values(errors)[0] as string[])[0] : "Salvataggio non riuscito."));
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
                    <InfoRow label="Nome">{profileUser.first_name} {profileUser.last_name}</InfoRow>
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
            <div className="bg-white text-gray-700 rounded-2xl p-4 shadow-sm flex items-center justify-between gap-3">
                <h1 className="text-xl font-semibold min-w-0 truncate">Curriculum</h1>
                {isMyProfile && (
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className="shrink-0 whitespace-nowrap text-sm text-blue-600 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-50"
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

                    {isTalent && (
                        <div className="border border-slate-200 rounded-xl p-3 space-y-3">
                            <p className="text-xs text-slate-500">
                                Questi dati, insieme agli anni di esperienza, calcolano il tuo rating tecnico.
                            </p>
                            <div>
                                <label className="text-sm text-slate-500 block mb-1">Titolo di studio</label>
                                <select
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
                                    value={form.livello_istruzione}
                                    onChange={(e) => setForm({ ...form, livello_istruzione: e.target.value })}
                                >
                                    <option value="" disabled>Seleziona…</option>
                                    {ISTRUZIONE_OPTIONS.map((o) => (
                                        <option key={o.value} value={o.value}>{o.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-sm text-slate-500 block mb-1">Certificazioni (separate da virgola)</label>
                                <input
                                    type="text"
                                    maxLength={500}
                                    placeholder="Es. HACCP, BLSD, Inglese B2"
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                                    value={form.certificazioni}
                                    onChange={(e) => setForm({ ...form, certificazioni: e.target.value })}
                                />
                            </div>
                        </div>
                    )}

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
                                className="w-full max-w-full min-w-0 appearance-none border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
                                value={(form as any)[key]}
                                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                            />
                        </div>
                    ))}

                    <label className="flex items-start gap-2 text-sm text-slate-500">
                        <input
                            type="checkbox"
                            className="mt-1 shrink-0"
                            checked={form.available}
                            onChange={(e) => setForm({ ...form, available: e.target.checked })}
                        />
                        Disponibile a nuove opportunità
                    </label>

                    <label className="flex items-start gap-2 text-sm text-slate-500">
                        <input
                            type="checkbox"
                            className="mt-1 shrink-0"
                            checked={form.curriculum_public}
                            onChange={(e) => setForm({ ...form, curriculum_public: e.target.checked })}
                        />
                        Rendi il curriculum pubblico (mostra anche la tua email)
                    </label>

                    {error && <p className="text-sm text-red-600">{error}</p>}

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
                <InfoRow label="Nome">{profileUser.first_name} {profileUser.last_name}</InfoRow>
                {profileUser.email && profileUser.curriculum_public && (
                    <InfoRow label="Email">
                        <a href={`mailto:${profileUser.email}`} className="text-blue-600">{profileUser.email}</a>
                    </InfoRow>
                )}
                {profileUser.bio && <InfoRow label="Bio">{profileUser.bio}</InfoRow>}
                {profileUser.city && (
                    <InfoRow label="Città">{profileUser.city}{profileUser.country ? `, ${profileUser.country}` : ""}</InfoRow>
                )}
                {profileUser.website && (
                    <InfoRow label="Sito">
                        <a href={profileUser.website} target="_blank" rel="noopener noreferrer" className="text-blue-600">{profileUser.website}</a>
                    </InfoRow>
                )}
                {profileUser.years_experience != null && profileUser.years_experience !== "" && (
                    <InfoRow label="Esperienza">{profileUser.years_experience} anni</InfoRow>
                )}
                {profileUser.contract_type && <InfoRow label="Contratto">{profileUser.contract_type}</InfoRow>}
                {profileUser.skills?.length > 0 && (
                    <div className="flex gap-2 flex-wrap items-center">
                        <span className="text-slate-500 text-sm">Skills:</span>
                        {profileUser.skills.map((s: string) => (
                            <span key={s} className="text-xs bg-slate-100 px-2 py-0.5 rounded-full max-w-full break-words">{s}</span>
                        ))}
                    </div>
                )}
                {profileUser.languages?.length > 0 && (
                    <div className="flex gap-2 flex-wrap items-center">
                        <span className="text-slate-500 text-sm">Lingue:</span>
                        {profileUser.languages.map((l: string) => (
                            <span key={l} className="text-xs bg-slate-100 px-2 py-0.5 rounded-full max-w-full break-words">{l}</span>
                        ))}
                    </div>
                )}
                <InfoRow label="Disponibile">{profileUser.available ? "Sì" : "No"}</InfoRow>
            </div>

            {/* Dati privati (solo mio profilo) */}
            {isMyProfile && (
                <div className="bg-white rounded-2xl p-4 shadow-sm space-y-2 text-gray-700">
                    {profileUser.phone && (
                        <InfoRow label="Telefono">
                            {profileUser.phone}{" "}
                            <span className="text-xs text-slate-400">(visibile alle aziende che ti sbloccano)</span>
                        </InfoRow>
                    )}
                    <p className="text-xs text-slate-400">Visibili solo a te 🔒</p>
                    {profileUser.birth_date && (
                        <InfoRow label="Data di nascita">
                            {new Date(profileUser.birth_date).toLocaleDateString("it-IT")}
                        </InfoRow>
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