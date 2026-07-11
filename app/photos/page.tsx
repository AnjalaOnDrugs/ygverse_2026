"use client";

import { useQuery } from "convex/react";
import { useMemo, useState } from "react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/components/AuthProvider";
import { LikesModal } from "@/components/photos/LikesModal";
import { PostCard } from "@/components/photos/PostCard";
import { PostViewer } from "@/components/photos/PostViewer";
import { Post, PostImage } from "@/components/photos/types";
import { UploadButton } from "@/components/photos/UploadButton";

type Tab = "yours" | "ygverse";
type Sort = "latest" | "mostLiked";

// One column on phones so each photo takes the full width; wider screens
// get a denser grid.
const GRID = "grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3";

export default function PhotosPage() {
  const { token, user } = useAuth();
  const [tab, setTab] = useState<Tab>("ygverse");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<Sort>("latest");
  const [viewerId, setViewerId] = useState<Id<"posts"> | null>(null);
  const [likersImageId, setLikersImageId] = useState<Id<"images"> | null>(null);

  const mine = useQuery(api.posts.listMine, token ? { token } : "skip");
  const feed = useQuery(api.posts.listAll, token ? { token } : "skip");

  const filteredFeed = useMemo(() => {
    if (!feed) return undefined;
    const term = search.trim().toLowerCase();
    const filtered = term
      ? feed.filter((post) => post.uploaderName.toLowerCase().includes(term))
      : [...feed];
    if (sort === "mostLiked") {
      // Rank by the collection's total likes across all its photos
      const totalLikes = (post: Post) =>
        post.images.reduce((sum, image) => sum + image.likeCount, 0);
      filtered.sort((a, b) => totalLikes(b) - totalLikes(a));
    } else {
      filtered.sort((a, b) => b.createdAt - a.createdAt);
    }
    return filtered;
  }, [feed, search, sort]);

  // Modals hold ids, not snapshots, so their content stays live (like
  // counts, comments) and they close automatically if the post is deleted.
  const allPosts = useMemo(
    () => [...(feed ?? []), ...(mine ?? [])],
    [feed, mine]
  );
  const viewerPost = viewerId
    ? allPosts.find((p) => p._id === viewerId) ?? null
    : null;
  const likersImage: PostImage | null = likersImageId
    ? allPosts
        .flatMap((p) => p.images)
        .find((image) => image._id === likersImageId) ?? null
    : null;

  if (!user) return null;

  return (
    <div className="pt-2">
      <div className="mb-4 flex justify-center gap-2">
        <button
          className={`tab-pill cursor-pointer ${tab === "ygverse" ? "active" : ""}`}
          onClick={() => setTab("ygverse")}
        >
          YGverse
        </button>
        <button
          className={`tab-pill cursor-pointer ${tab === "yours" ? "active" : ""}`}
          onClick={() => setTab("yours")}
        >
          Yours
        </button>
      </div>

      {tab === "ygverse" && (
        <>
          <div className="mb-5 flex gap-2">
            <input
              className="input-dark flex-1"
              type="search"
              placeholder="Search by uploader…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="select-dark"
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              aria-label="Sort posts"
            >
              <option value="latest">Latest</option>
              <option value="mostLiked">Most liked</option>
            </select>
          </div>

          {filteredFeed === undefined ? (
            <CenteredSpinner />
          ) : filteredFeed.length === 0 ? (
            <EmptyState
              message={
                search
                  ? "No posts from that uploader"
                  : "No posts yet — be the first to post!"
              }
            />
          ) : (
            <div className={GRID}>
              {filteredFeed.map((post) => (
                <PostCard
                  key={post._id}
                  post={post}
                  canDelete={false}
                  onOpen={(p) => setViewerId(p._id)}
                  onShowLikers={(image) => setLikersImageId(image._id)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {tab === "yours" &&
        (mine === undefined ? (
          <CenteredSpinner />
        ) : mine.length === 0 ? (
          <EmptyState message="You haven't posted anything yet" />
        ) : (
          <div className={GRID}>
            {mine.map((post) => (
              <PostCard
                key={post._id}
                post={post}
                canDelete
                onOpen={(p) => setViewerId(p._id)}
                onShowLikers={(image) => setLikersImageId(image._id)}
              />
            ))}
          </div>
        ))}

      <UploadButton />

      {viewerPost && (
        <PostViewer
          post={viewerPost}
          onClose={() => setViewerId(null)}
          onShowLikers={(image) => setLikersImageId(image._id)}
        />
      )}
      {likersImage && (
        <LikesModal image={likersImage} onClose={() => setLikersImageId(null)} />
      )}
    </div>
  );
}

function CenteredSpinner() {
  return (
    <div className="flex justify-center py-16">
      <div className="spinner-teal" />
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="py-16 text-center">
      <p className="font-display mb-2 text-2xl text-pink opacity-60">✦</p>
      <p className="text-sm text-muted">{message}</p>
    </div>
  );
}
