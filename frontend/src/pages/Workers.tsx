import WorkerCard from "../components/WorkerCard";
import workers from "../data/mockWorkers";

export default function Workers() {
  return (
    <div className="mx-4">

      {/* HEADER */}
      <div className="bg-gradient-to-r from-blue-700 to-blue-500 text-white rounded-xl p-5 mb-6">
        <h1 className="text-xl font-bold">Talenti</h1>
        <p className="text-sm opacity-90">
          Scopri i talenti attivi su HireWave.
        </p>
      </div>

      <div className="space-y-6">
        {workers.map((worker) => (
          <WorkerCard key={worker.id} worker={worker} />
        ))}
      </div>
      <div className="space-y-6">
        {workers.map((worker) => (
          <WorkerCard key={worker.id} worker={worker} />
        ))}
      </div>
      <div className="space-y-6">
        {workers.map((worker) => (
          <WorkerCard key={worker.id} worker={worker} />
        ))}
      </div>
    </div>
  );
}
