<<<<<<< HEAD
type Company = {
  id: number;
  name: string;
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

      <img src={company.image} className="w-full h-40 object-cover rounded-lg mb-3" />

      <div className="flex items-center justify-between m-2">
        <h2 className="font-semibold text-lg text-gray-600">{company.name}</h2>
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
          <span key={i} className="px-2 py-1 text-gray-600  border-1 border-gray-600 rounded-full text-xs cursor-pointer">
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
=======
import {
    BookmarkIcon,
    PaperAirplaneIcon,
    UserPlusIcon,
} from "@heroicons/react/24/outline";
import { Link } from "react-router-dom";

type CompanyCardProps = {
    id: number;
    firstName: string;
    lastName: string;
    imageUrl: string;
};

export default function CompanyCard(props: CompanyCardProps) {
    const { id, firstName, lastName, imageUrl } = props;

    return (
        <Link
            to={`/profile/${firstName.toLowerCase()}-${lastName.toLowerCase()}`}
            className="block relative h-[320px] rounded-[20px] overflow-hidden shadow-sm group"
        >
            {/* Background Image */}
            <img
                src={imageUrl}
                alt={`${firstName} ${lastName}`}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />

            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/30 to-black/10"></div>

            {/* Top Right Action Buttons */}
            <div className="absolute top-3 right-3 flex flex-col gap-2">
                <button
                    className="w-8! h-8! p-0! rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/40 transition"
                    onClick={(e) => e.preventDefault()}
                >
                    <BookmarkIcon className="w-5 h-5" />
                </button>
                <Link
                    className="w-8! h-8! p-0! rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/40 transition"
                    to="/chat"
                >
                    <PaperAirplaneIcon className="w-5 h-5 transform -mt-0.5 ml-0.5 -rotate-45" />
                </Link>
            </div>

            {/* Bottom Content */}
            <div className="absolute bottom-0 left-0 right-0 p-4 flex flex-col justify-end">
                <div className="flex items-end justify-between">
                    <div className="flex-1 pr-2">
                        <h2 className="text-lg font-bold text-white tracking-tight leading-tight mb-0.5">
                            {firstName} {lastName}
                        </h2>
                    </div>

                    {/* FAB Button */}
                    <button
                        className="w-10! h-10! p-0! shrink-0 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-xl hover:bg-blue-500 transition transform hover:scale-105 active:scale-95"
                        onClick={(e) => e.preventDefault()}
                    >
                        <UserPlusIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </Link>
    );
>>>>>>> dev_stefano
}
