import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center gap-3 bg-slate-50 px-4 text-center text-slate-700">
      <h1 className="text-3xl font-bold text-slate-900">404</h1>
      <p>Pagina non trovata</p>
      <Link to="/feed" className="text-sm text-blue-600 font-semibold hover:underline">
        Torna alla home
      </Link>
    </div>
  );
}
