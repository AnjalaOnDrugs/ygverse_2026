"use client";

/* eslint-disable @next/next/no-img-element -- photo URLs come from the
   Convex storage host, which changes between dev and prod; plain <img>
   avoids next/image remote-host config for user-generated content. */

import { useMutation } from "convex/react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/components/AuthProvider";
import { Post, PostImage } from "./types";

// The card front represents the cover photo: its counts and its like
// button. Other photos in the collection are reached through the viewer.
export function PostCard({
  post,
  canDelete,
  onOpen,
  onShowLikers,
}: {
  post: Post;
  canDelete: boolean;
  onOpen: (post: Post) => void;
  onShowLikers: (image: PostImage) => void;
}) {
  const { token } = useAuth();
  const toggleLike = useMutation(api.likes.toggleLike);
  const deletePost = useMutation(api.posts.deletePost);
  const [pending, setPending] = useState(false);
  const [popping, setPopping] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const cover = post.images[0];

  async function handleToggleLike() {
    if (!token || pending || !cover) return;
    setPending(true);
    setPopping(true);
    try {
      await toggleLike({ token, imageId: cover._id });
    } finally {
      setPending(false);
      setTimeout(() => setPopping(false), 300);
    }
  }

  async function handleDelete() {
    if (!token || !confirm("Delete this post and all its photos?")) return;
    setDeleting(true);
    try {
      await deletePost({ token, postId: post._id });
    } finally {
      setDeleting(false);
    }
  }

  if (!cover?.url) return null;

  return (
    <div className={`stack rise-in ${post.images.length > 1 ? "stack-multi" : ""} ${deleting ? "opacity-40" : ""}`}>
      <div className="card relative">
        <img
          src={cover.url}
          alt={post.name}
          loading="lazy"
          className="aspect-square w-full cursor-pointer object-cover transition-opacity hover:opacity-85"
          onClick={() => onOpen(post)}
        />
        {post.images.length > 1 && (
          <span className="stack-count">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="7" y="7" width="14" height="14" rx="2" />
              <path d="M3 15V5a2 2 0 0 1 2-2h10" />
            </svg>
            {post.images.length}
          </span>
        )}
        {canDelete && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            aria-label="Delete post"
            className="absolute left-2 top-2 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-[rgba(4,4,8,0.7)] text-hot backdrop-blur-sm transition-colors hover:bg-hot hover:text-bg"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
            </svg>
          </button>
        )}
        <div className="flex items-center justify-between gap-2 px-3 py-2.5">
          <span className="truncate text-xs text-muted">
            {post.isMine ? <span className="text-teal">You</span> : post.uploaderName}
          </span>
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => onOpen(post)}
              className="flex cursor-pointer items-center gap-1 text-xs text-muted transition-colors hover:text-teal"
              aria-label={`${cover.commentCount} comments`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 8.5-8.5 8.38 8.38 0 0 1 8.5 8.5Z" />
              </svg>
              {cover.commentCount > 0 && cover.commentCount}
            </button>
            <button
              onClick={() => onShowLikers(cover)}
              className="cursor-pointer text-xs font-semibold text-teal"
              aria-label="See who liked this"
            >
              {cover.likeCount}
            </button>
            <button
              onClick={handleToggleLike}
              disabled={pending}
              aria-label={cover.likedByMe ? "Unlike" : "Like"}
              className={`cursor-pointer ${popping ? "heart-pop" : ""}`}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill={cover.likedByMe ? "#ff5c8a" : "none"}
                stroke={cover.likedByMe ? "#ff5c8a" : "#8b8794"}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
