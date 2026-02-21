import type { FeedPost } from "./Feed";

export type PublicProfile = {
  id: number;
  name: string;
  role: "worker" | "pro" | "company";
};

export type PublicProfileResponse = {
  user: PublicProfile;
  posts: FeedPost[];
};
