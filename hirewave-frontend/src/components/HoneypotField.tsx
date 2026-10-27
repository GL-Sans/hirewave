// Campo esca: invisibile alle persone (e ignorato da tastiera, lettori di schermo
// e autocompletamento), ma i bot che compilano tutti i campi lo riempiono.
// Il backend scarta e registra gli invii con questo campo pieno.
export const HONEYPOT_FIELD = "company_website";

export default function HoneypotField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    return (
        <div aria-hidden="true" style={{ position: "absolute", left: "-10000px", top: "auto", width: 1, height: 1, overflow: "hidden" }}>
            <label>
                Sito web aziendale
                <input
                    type="text"
                    name={HONEYPOT_FIELD}
                    tabIndex={-1}
                    autoComplete="off"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                />
            </label>
        </div>
    );
}
