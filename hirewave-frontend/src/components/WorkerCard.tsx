type Worker = {
    id: number;
    first_name: string;
    last_name: string;
    sector: string;
    location: string;
    description: string;
    image: string;
    verified?: boolean;
    tags: string[];
};

export default function WorkerCard({ worker }: { worker: Worker }) {
    return (
        <div className="bg-white rounded-xl shadow-sm pb-1 my-10">
            <img
                src={worker.image}
                className="w-full h-40 object-cover rounded-lg mb-3"
            />

            <div className="flex items-center justify-between m-2">
                <h2 className="font-semibold text-lg text-gray-600">
                    {worker.first_name} {worker.last_name}
                </h2>
                {worker.verified && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                        Verificata
                    </span>
                )}
            </div>

            <p className="text-sm text-gray-500 m-2">{worker.sector}</p>
            <p className="text-sm text-gray-600 m-2">{worker.description}</p>

            <div className="flex flex-wrap gap-2 m-2">
                {worker.tags.map((tag, i) => (
                    <span
                        key={i}
                        className="px-2 py-1 text-gray-600  border-1 border-gray-600 rounded-full text-xs cursor-pointer"
                    >
                        {tag}
                    </span>
                ))}
            </div>

            <p className="text-sm text-gray-600 m-2">{worker.location}</p>
        </div>
    );
}
