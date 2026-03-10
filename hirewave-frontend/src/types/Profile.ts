import type { FeedPost } from "./Feed";

export type PublicProfile = {
<<<<<<< HEAD
  id: number;
  name: string;
  role: "worker" | "pro" | "company";
};

export type PublicProfileResponse = {
  user: PublicProfile;
  posts: FeedPost[];
=======
    id: number;
    first_name: string;
    last_name: string;
    role: "worker" | "pro" | "company";
};

export type PublicProfileResponse = {
    user: PublicProfile;
    posts: FeedPost[];
>>>>>>> dev_stefano
};
