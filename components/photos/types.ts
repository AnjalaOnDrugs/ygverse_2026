import { Id } from "@/convex/_generated/dataModel";

export type PostImage = {
  _id: Id<"images">;
  url: string | null;
  likeCount: number;
  likedByMe: boolean;
  commentCount: number;
};

export type Post = {
  _id: Id<"posts">;
  name: string;
  createdAt: number;
  uploaderName: string;
  isMine: boolean;
  images: PostImage[];
};
