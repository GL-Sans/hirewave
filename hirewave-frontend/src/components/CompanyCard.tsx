type Company = {
    id: number;
    first_name: string;
    last_name: string;
    sector: string;
    location: string;
    employees: string;
    description: string;
    image: string;
    verified?: boolean;
    tags: string[];
    positionsOpen: number;
};

export default function CompanyCard({ company }: { company: Company }) {
    return (
        <div className="bg-white rounded-xl shadow-sm pb-1 my-10">
            <img
                src={company.image}
                className="w-full h-40 object-cover rounded-lg mb-3"
            />

            <div className="flex items-center justify-between m-2">
                <h2 className="font-semibold text-lg text-gray-600">
                    {company.first_name} {company.last_name}
                </h2>
                {company.verified && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                        Verificata
                    </span>
                )}
            </div>

            <p className="text-sm text-gray-500 m-2">{company.sector}</p>
            <p className="text-sm text-gray-600 m-2">{company.description}</p>

            <div className="flex flex-wrap gap-2 m-2">
                {company.tags.map((tag, i) => (
                    <span
                        key={i}
                        className="px-2 py-1 text-gray-600 border border-gray-600 rounded-full text-xs cursor-pointer"
                    >
                        {tag}
                    </span>
                ))}
            </div>

            <p className="text-sm text-gray-600 m-2">
                {company.location} • {company.employees}
            </p>

            <a href="#" className="text-blue-600 text-sm font-medium m-2">
                {company.positionsOpen} posizioni aperte →
            </a>
        </div>
    );
}
