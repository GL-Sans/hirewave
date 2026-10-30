import { useState } from "react";
import { Link } from "react-router-dom";
import { InformationCircleIcon } from "@heroicons/react/24/outline";
import type { ConsiglioRating, DocumentoPreset, RatingDettaglio, RatingStorico, StatoVoce, VoceRating } from "../types/Rating";

type Props = {
    dettaglio: RatingDettaglio;
    // Solo sul proprio profilo: consigli, storico e caricamento documenti
    storico?: RatingStorico[];
    curriculumPath?: string;
    onUpload?: (preset: DocumentoPreset) => void;
};

// Un colore per voce: lo stesso nella barra composta e nelle righe
const COLORI: Record<VoceRating["chiave"], string> = {
    istruzione: "bg-indigo-500",
    esperienza: "bg-blue-500",
    certificazioni: "bg-emerald-500",
};

const STATI: Record<StatoVoce | "in_verifica", { label: string; className: string }> = {
    verificato: { label: "Verificato", className: "bg-green-100 text-green-700 border-green-200" },
    parziale: { label: "In parte verificato", className: "bg-amber-100 text-amber-700 border-amber-200" },
    dichiarato: { label: "Dichiarato", className: "bg-slate-100 text-slate-600 border-slate-200" },
    mancante: { label: "Non indicato", className: "bg-slate-100 text-slate-400 border-slate-200" },
    in_verifica: { label: "In verifica", className: "bg-blue-100 text-blue-700 border-blue-200" },
};

function StatoPill({ stato }: { stato: StatoVoce | "in_verifica" }) {
    const s = STATI[stato];
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-semibold whitespace-nowrap ${s.className}`}>
            {s.label}
        </span>
    );
}

const PRESET: Partial<Record<ConsiglioRating["tipo"], DocumentoPreset["tipo"]>> = {
    istruzione: "istruzione",
    esperienza: "esperienza",
    certificazione: "certificazione",
};

export default function RatingBreakdown({ dettaglio, storico, curriculumPath, onUpload }: Props) {
    const { totale, voci, max_dichiarato, consigli } = dettaglio;
    const isOwner = !!onUpload;
    // Dettagli chiusi: a colpo d'occhio solo punteggio e barra
    const [open, setOpen] = useState(false);
    const guadagno = isOwner ? (consigli ?? []).reduce((s, c) => s + c.punti, 0) : 0;

    return (
        <div className="border border-slate-200 rounded-xl p-4 w-full text-left">
            <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                    Rating Tecnico
                    <button
                        type="button"
                        onClick={() => setOpen((o) => !o)}
                        aria-expanded={open}
                        aria-label={open ? "Nascondi i dettagli del rating" : "Come si calcola questo rating"}
                        title={open ? "Nascondi dettagli" : "Perché questo rating?"}
                        className={`w-6! h-6! p-0! rounded-full! border-0! flex items-center justify-center transition-colors ${
                            open ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500 hover:bg-blue-50 hover:text-blue-600"
                        }`}
                    >
                        <InformationCircleIcon className="w-4 h-4" />
                    </button>
                </span>
                <span className="text-2xl font-bold text-slate-900 leading-none">
                    {totale}
                    <span className="text-sm text-slate-400 font-normal">/100</span>
                </span>
            </div>

            {/* Barra composta: ogni voce occupa i suoi punti su 100 */}
            <div className="relative mt-3" aria-hidden>
                <div className="flex w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    {voci.map((v) => (
                        <div key={v.chiave} className={`${COLORI[v.chiave]} h-full`} style={{ width: `${v.punti}%` }} />
                    ))}
                </div>
                {/* Tetto dei dati solo dichiarati */}
                <div className="absolute -top-1 h-4.5 border-l-2 border-dashed border-slate-400" style={{ left: `${max_dichiarato}%` }} />
            </div>
            {!open && guadagno > 0 && (
                <button
                    type="button"
                    onClick={() => setOpen(true)}
                    className="mt-2 p-0! border-0! bg-transparent text-xs font-semibold text-green-700 hover:underline"
                >
                    Puoi guadagnare fino a +{guadagno} punti →
                </button>
            )}

            {open && (<>
            <p className="mt-1.5 text-[11px] text-slate-500">
                {voci.map((v, i) => (
                    <span key={v.chiave}>
                        {i > 0 && " + "}
                        <span className={`inline-block w-2 h-2 rounded-full align-middle mr-1 ${COLORI[v.chiave]}`} />
                        {v.punti} {v.etichetta.toLowerCase()}
                    </span>
                ))}
            </p>
            <p className="mt-2 text-[11px] text-slate-400">
                Linea tratteggiata: {max_dichiarato} è il massimo con dati solo dichiarati. Oltre si sale verificandoli con documenti.
            </p>

            {/* Il perché, voce per voce */}
            <ul className="mt-4 space-y-3">
                {voci.map((v) => (
                    <li key={v.chiave}>
                        <div className="flex items-center justify-between gap-2">
                            <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 min-w-0">
                                <span className={`w-2 h-2 rounded-full shrink-0 ${COLORI[v.chiave]}`} />
                                {v.etichetta}
                                <StatoPill stato={v.stato} />
                                {v.in_verifica && <StatoPill stato="in_verifica" />}
                            </span>
                            <span className="text-xs font-bold text-slate-800 shrink-0">
                                {v.punti}
                                <span className="text-slate-400 font-normal">/{v.max}</span>
                            </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1 mt-1.5">
                            <div className={`${COLORI[v.chiave]} h-1 rounded-full`} style={{ width: `${(v.punti / v.max) * 100}%` }} />
                        </div>
                        <p className="text-xs text-slate-700 mt-1 break-words">{v.valore}</p>
                        {v.elementi && v.elementi.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                                {v.elementi.map((e, i) => (
                                    <span
                                        key={i}
                                        className={`text-[10px] px-2 py-0.5 rounded-full border ${
                                            e.stato === "verificato"
                                                ? "bg-green-100 text-green-700 border-green-200"
                                                : e.stato === "in_verifica"
                                                  ? "bg-blue-100 text-blue-700 border-blue-200"
                                                  : "bg-slate-100 text-slate-600 border-slate-200"
                                        }`}
                                    >
                                        {e.nome ?? (e.stato === "verificato" ? "Verificata" : "Dichiarata")}
                                        {" · "}
                                        {e.stato === "oltre_limite" ? "oltre la terza, 0 punti" : `${e.punti} pt`}
                                    </span>
                                ))}
                            </div>
                        )}
                        <p className="text-[11px] text-slate-400 mt-1">{v.spiegazione}</p>
                    </li>
                ))}
            </ul>

            {isOwner && consigli && consigli.length > 0 && (
                <div className="mt-4 border-t border-slate-100 pt-3">
                    <p className="text-xs font-semibold text-slate-700 mb-2">Come aumentare il rating</p>
                    <ul className="space-y-2">
                        {consigli.map((c, i) => {
                            const tipoDoc = PRESET[c.tipo];
                            // "Indica il titolo" si fa dal curriculum, non con un documento
                            const daDocumento = tipoDoc && !(c.tipo === "istruzione" && c.nota);
                            return (
                                <li key={i} className="flex items-center justify-between gap-2">
                                    <span className="text-xs text-slate-600 min-w-0">
                                        <strong className="text-green-700">+{c.punti}</strong> {c.azione}
                                    </span>
                                    {daDocumento ? (
                                        <button
                                            type="button"
                                            onClick={() => onUpload!({ tipo: tipoDoc!, riferimento: c.riferimento })}
                                            className="shrink-0 text-[11px] font-semibold px-2.5! py-1! rounded-lg! border! border-blue-200! text-blue-600 bg-white hover:bg-blue-50"
                                        >
                                            Carica
                                        </button>
                                    ) : (
                                        curriculumPath && (
                                            <Link to={curriculumPath} className="shrink-0 text-[11px] font-semibold text-blue-600 hover:underline">
                                                Aggiorna
                                            </Link>
                                        )
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}

            {isOwner && storico && storico.length > 0 && (
                <div className="mt-4 border-t border-slate-100 pt-3">
                    <p className="text-xs font-semibold text-slate-700 mb-2">Ultime variazioni</p>
                    <ul className="space-y-1.5">
                        {storico.map((s, i) => {
                            const diff = s.valore - s.valore_precedente;
                            return (
                                <li key={i} className="text-[11px] text-slate-500 flex gap-2">
                                    <span className={`font-bold shrink-0 w-8 ${diff >= 0 ? "text-green-700" : "text-red-600"}`}>
                                        {diff >= 0 ? `+${diff}` : diff}
                                    </span>
                                    <span className="min-w-0">
                                        {s.valore_precedente} → {s.valore} · {s.motivo}
                                        <span className="text-slate-400"> · {new Date(s.created_at).toLocaleDateString("it-IT")}</span>
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}

            <details className="mt-4 border-t border-slate-100 pt-3 text-[11px] text-slate-500">
                <summary className="cursor-pointer text-xs font-semibold text-slate-700">Come si calcola</summary>
                <div className="mt-2 space-y-1.5">
                    <p>
                        <strong>Rating = istruzione (max 30) + esperienza (max 40) + certificazioni (max 30).</strong>
                    </p>
                    <p>Istruzione: licenza media 6 · diploma 15 · laurea triennale 23 · laurea magistrale 30.</p>
                    <p>Esperienza: 6 punti l'anno per i primi 5 anni, poi 2 l'anno fino a 10 anni (40 punti).</p>
                    <p>Certificazioni: la prima 12 punti, la seconda e la terza 9 ciascuna.</p>
                    <p>
                        Ogni dato vale l'<strong>80%</strong> se dichiarato e il <strong>100%</strong> se verificato con un documento.
                        Con almeno un documento verificato il profilo ottiene il badge verde "Certificato".
                    </p>
                </div>
            </details>
            </>)}
        </div>
    );
}
