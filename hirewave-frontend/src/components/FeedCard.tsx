import { Link } from "react-router-dom";
import { UserIcon } from "@heroicons/react/24/solid";
import { useAuth } from "../context/AuthContext";
import { profilePath } from "../utils/profilePath";

type FeedCardProps = {
    postId: number;
    type: "job" | "service";
    title: string;
    location: string;
    description?: string | null;
    timeAgo: string;
    sponsored?: boolean;
    imageUrl?: string;
    tags: string[];
    contractType: string;
    budget: string;
    budgetType?: string | null;
    author: {
        id: number;
        first_name: string;
        last_name?: string | null;
        role: "WORKER" | "PRO" | "COMPANY";
        profile_image?: string | null;
    };
};

export default function FeedCard(props: FeedCardProps) {
    const {
        type,
        title,
        description,
        location,
        timeAgo,
        sponsored,
        imageUrl,
        tags,
        contractType,
        budget,
        budgetType,
        author,
    } = props;

    const { user } = useAuth();

    const isCompanyViewer = user?.role === "COMPANY";
    const isProViewer = user?.role === "PRO";

    const isCompanyAuthor = author.role === "COMPANY";
    const isProAuthor = author.role === "PRO";
    const isWorkerAuthor = author.role === "WORKER";

    const isOwnPost = user?.id === author.id;

    // ❌ COMPANY non interagisce con COMPANY
    const hideCompanyToCompany =
        isCompanyViewer && isCompanyAuthor;

    // ❌ PRO non interagisce con PRO su SERVICE
    const hideProToPro =
        isProViewer && isProAuthor && type === "service";

    const hideCTA =
        isOwnPost || hideCompanyToCompany || hideProToPro;

    const authorPath = profilePath(author);

    return (
        <article className="bg-white rounded-2xl shadow-sm overflow-hidden flex flex-col h-full">

            {/* HEADER */}
            <div className="px-4 pt-3 flex items-center justify-between text-xs text-slate-500">
                <span className="truncate">
                    {location} · {timeAgo}
                </span>

                {sponsored ? (
                    <span className="text-[10px] uppercase tracking-wide px-2 py-1 rounded-full bg-amber-100 text-amber-700 shrink-0">
                        Sponsorizzato
                    </span>
                ) : (
                    <span />
                )}
            </div>

            {/* IMAGE */}
            {imageUrl && (
                <div className="mt-3">
                    <img
                        src={imageUrl}
                        alt={title}
                        className="w-full h-40 object-cover"
                    />
                </div>
            )}

            {/* BODY */}
            <div className="p-4 flex flex-col flex-1">

                <div className="flex-1 flex flex-col gap-2">

                    <h2 className="font-semibold text-slate-900 text-sm line-clamp-1">
                        {title}
                    </h2>

                    {description && (
                        <p className="text-slate-600 text-sm line-clamp-3 min-h-[60px]">
                            {description}
                        </p>
                    )}

                    {/* Autore */}
                    <Link
                        to={authorPath}
                        className="flex items-center gap-2 mt-1 group"
                    >
                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200 shrink-0">
                            {author.profile_image ? (
                                <img
                                    src={`/storage/${author.profile_image}`}
                                    alt={`${author.first_name} avatar`}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                            )}
                        </div>

                        <span className="text-sm text-slate-900 font-medium group-hover:text-blue-600 transition-colors truncate">
                            {author.first_name} {author.last_name ?? ""}
                        </span>
                    </Link>

                    <div className="flex flex-wrap gap-1 mt-1 min-h-[24px]">
                        {tags.map((tag) => (
                            <span
                                key={tag}
                                className="px-2 py-0.5 rounded-full bg-slate-100 text-[11px] text-slate-600"
                            >
                                #{tag}
                            </span>
                        ))}
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-600 mt-2">
                        <span className="truncate">{contractType}</span>
                        <span className="font-semibold whitespace-nowrap">
                            {budget !== "—" && budget
                                ? `€ ${budget}${
                                      budgetType ? ` / ${budgetType}` : ""
                                  }`
                                : budget}
                        </span>
                    </div>
                </div>

                {/* CTA */}
                {!hideCTA && (
                    <div className="mt-auto pt-3 flex flex-col gap-2">

                        {isCompanyViewer ? (
                            // Cognome visibile = profilo sbloccato; altrimenti si passa dal profilo per sbloccarlo
                            <Link to={author.last_name ? `/chat?to=${author.id}` : authorPath}>
                                <button className="w-full bg-blue-600 text-white text-sm font-semibold py-1.5 rounded-lg">
                                    {isWorkerAuthor
                                        ? "Contatta il lavoratore"
                                        : "Contatta il professionista"}
                                </button>
                            </Link>
                        ) : (
                            <Link to={`/chat?to=${author.id}`}>
                                <button className="w-full bg-green-600 text-white text-sm font-semibold py-1.5 rounded-lg">
                                    {type === "job"
                                        ? "Candidati ora"
                                        : "Offri il tuo servizio"}
                                </button>
                            </Link>
                        )}

                        {user?.role !== "COMPANY" && (
                            <button className="w-full border border-slate-200 text-slate-600 text-xs py-1.5 rounded-lg">
                                Suggerisci a un amico
                            </button>
                        )}
                    </div>
                )}
            </div>
        </article>
    );
}