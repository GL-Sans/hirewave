export type FeedUser = {
    id: number;
    first_name: string;
    last_name: string;
    role: "WORKER" | "PRO" | "COMPANY";
    profile_image?: string | null;
};

export type FeedPost = {
    id: number;
    type: "job" | "service";
    title: string;
    description?: string | null;
    location?: string | null;
    sponsored: boolean;
    contract_type?: string | null;
    budget?: string | null;
    budget_type?: string | null;
    image_url?: string | null;
    image?: string | null;
    created_at: string;
    user: FeedUser;
};
