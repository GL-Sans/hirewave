import {
    BookmarkIcon,
    PaperAirplaneIcon,
    UserPlusIcon,
} from "@heroicons/react/24/outline";
import { Link, useNavigate } from "react-router-dom";

type CompanyCardProps = {
    id: number;
    firstName: string;
    lastName: string;
    imageUrl: string;
};

export default function CompanyCard(props: CompanyCardProps) {
    const { id, firstName, lastName, imageUrl } = props;
    const navigate = useNavigate();

    return (
        <Link
            to={`/company/${id}`}
            className="block relative h-[320px] rounded-[20px] overflow-hidden shadow-sm group"
        >
            <img
                src={imageUrl}
                alt={`${firstName} ${lastName}`}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/30 to-black/10"></div>

            <div className="absolute top-3 right-3 flex flex-col gap-2">
                <button
                    className="w-8! h-8! p-0! rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/40 transition"
                    onClick={(e) => e.preventDefault()}
                >
                    <BookmarkIcon className="w-5 h-5" />
                </button>
                <button
                    className="w-8! h-8! p-0! rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/40 transition"
                    onClick={(e) => { e.preventDefault(); navigate("/chat"); }}
                >
                    <PaperAirplaneIcon className="w-5 h-5 transform -mt-0.5 ml-0.5 -rotate-45" />
                </button>
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-4 flex flex-col justify-end">
                <div className="flex items-end justify-between">
                    <div className="flex-1 pr-2">
                        <h2 className="text-lg font-bold text-white tracking-tight leading-tight mb-0.5">
                            {firstName} {lastName}
                        </h2>
                    </div>
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
}