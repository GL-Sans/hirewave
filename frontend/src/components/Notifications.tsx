type Props = {
  open: boolean;
  onClose: () => void;
};

export default function Notifications({ open, onClose }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[49] flex justify-end items-start pt-16 pr-4">
      
      {/* BACKDROP */}
      <div
        className="fixed inset-0 bg-black/20"
        onClick={onClose}
      ></div>

      {/* PANEL NOTIFICHE */}
      <div className="relative z-[210] w-80 bg-white shadow-xl rounded-xl overflow-hidden">

        {/* HEADER */}
        <div className="px-4 py-3 border-b font-semibold text-gray-800">
          Notifiche
        </div>

        {/* LISTA NOTIFICHE */}
        <div className="max-h-[70vh] overflow-y-auto">
          
          {/* esempio 1 */}
          <div className="p-4 border-b hover:bg-gray-50 cursor-pointer transition">
            <p className="text-sm font-medium text-gray-900">
              Nuova candidatura ricevuta
            </p>
            <p className="text-xs text-gray-600 mt-1">
              Mario Rossi ha inviato il suo profilo.
            </p>
            <p className="text-[11px] text-gray-400 mt-1">
              2h fa
            </p>
          </div>

          {/* esempio 2 */}
          <div className="p-4 border-b hover:bg-gray-50 cursor-pointer transition">
            <p className="text-sm font-medium text-gray-900">
              Lavoratore verificato nella tua zona
            </p>
            <p className="text-xs text-gray-600 mt-1">
              Un cameriere è attualmente disponibile a Pescara.
            </p>
            <p className="text-[11px] text-gray-400 mt-1">
              5h fa
            </p>
          </div>

          {/* esempio 3 */}
          <div className="p-4 border-b hover:bg-gray-50 cursor-pointer transition">
            <p className="text-sm font-medium text-gray-900">
              Aggiornamento azienda
            </p>
            <p className="text-xs text-gray-600 mt-1">
              La tua pagina aziendale è stata visitata 34 volte oggi.
            </p>
            <p className="text-[11px] text-gray-400 mt-1">
              1 giorno fa
            </p>
          </div>

        </div>

      </div>
    </div>
  );
}
