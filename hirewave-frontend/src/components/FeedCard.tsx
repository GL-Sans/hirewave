import { Link } from "react-router-dom";

type FeedCardProps = {
    postId: number;
    type: "job" | "service";
    title: string;
    location: string;
    timeAgo: string;
    sponsored?: boolean;
    imageUrl?: string;
    tags: string[];
    contractType: string;
    budget: string;
    author: {
        id: number;
        first_name: string;
        last_name: string;
        role: "worker" | "pro" | "company";
    };
};

export default function FeedCard(props: FeedCardProps) {
    const {
        type,
        title,
        location,
        timeAgo,
        sponsored,
        imageUrl,
        tags,
        contractType,
        budget,
        author,
    } = props;

    return (
        <article className="bg-white rounded-2xl shadow-sm overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-4 pt-3 flex items-center justify-between text-xs text-slate-500">
                <span>
                    {location} · {timeAgo}
                </span>
                {sponsored ? (
                    <span className="text-[10px] uppercase tracking-wide px-2 py-1 rounded-full bg-amber-100 text-amber-700">
                        Sponsorizzato
                    </span>
                ) : (
                    <span></span>
                )}
            </div>

            {/* Image */}
            {imageUrl && (
                <div className="mt-3">
                    <img
                        src={imageUrl}
                        alt={title}
                        className="w-full h-40 object-cover"
                    />
                </div>
            )}

            {/* Body */}
            <div className="p-4 flex flex-col gap-2 flex-1">
                {/* Titolo */}
                <h2 className="font-semibold text-slate-900 text-sm line-clamp-2">
                    {title}
                </h2>

                {/* Autore */}
                <Link
                    to={`/profile/${author.id}`}
                    className="text-xs text-blue-600 font-semibold hover:underline"
                >
                    {author.first_name} {author.last_name}
                </Link>

                {/* Tags */}
                <div className="flex flex-wrap gap-1 mt-1">
                    {tags.map((tag) => (
                        <span
                            key={tag}
                            className="px-2 py-0.5 rounded-full bg-slate-100 text-[11px] text-slate-600"
                        >
                            #{tag}
                        </span>
                    ))}
                </div>

                {/* Meta */}
                <div className="flex items-center justify-between text-xs text-slate-600 mt-2">
                    <span>{contractType}</span>
                    <span className="font-semibold">{budget}</span>
                </div>

                {/* CTA dinamiche */}
                <div className="mt-3 flex flex-col gap-2">
                    {type === "job" ? (
                        <>
                            <button className="w-full bg-blue-600 text-white text-sm font-semibold py-1.5 rounded-lg">
                                Candidati ora
                            </button>
                            <button className="w-full border border-blue-600 text-blue-600 text-sm font-semibold py-1.5 rounded-lg">
                                Chatta con l’azienda
                            </button>
                        </>
                    ) : (
                        <>
                            <button className="w-full bg-green-600 text-white text-sm font-semibold py-1.5 rounded-lg">
                                Offri il tuo servizio
                            </button>
                            <Link to="/chat">
                                <button className="w-full border border-green-600 text-green-600 text-sm font-semibold py-1.5 rounded-lg">
                                    Contatta il professionista
                                </button>
                            </Link>
                        </>
                    )}

                    <button className="w-full border border-slate-200 text-slate-600 text-xs py-1.5 rounded-lg">
                        Suggerisci a un amico
                    </button>
                </div>
            </div>
        </article>
    );
}
