

export default function Footer() {
  
  return (
    <footer className="bg-white border-t mt-8">
        <div className="max-w-5xl mx-auto px-4 py-6 text-center text-sm text-slate-500">
            &copy; {new Date().getFullYear()} HireWave. Tutti i diritti riservati.
        </div>
    </footer>
  );
}