"use client";

/* eslint-disable @next/next/no-img-element -- full-size user photos from Convex storage */

import { useMutation, useQuery } from "convex/react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/components/AuthProvider";
import { timeAgo } from "@/lib/timeAgo";
import { Post, PostImage } from "./types";

// Every photo in a collection carries its own likes and comments; the
// panel below the image switches with the carousel.
export function PostViewer({
  post,
  onClose,
  onShowLikers,
}: {
  post: Post;
  onClose: () => void;
  onShowLikers: (image: PostImage) => void;
}) {
  const { token } = useAuth();
  const [index, setIndex] = useState(0);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [pending, setPending] = useState(false);
  const listRef = useRef<HTMLUListElement>(null);

  const count = post.images.length;
  const safeIndex = Math.min(index, count - 1);
  const current = post.images[safeIndex];

  const comments = useQuery(
    api.comments.list,
    token && current ? { token, imageId: current._id } : "skip"
  );
  const addComment = useMutation(api.comments.add);
  const removeComment = useMutation(api.comments.remove);
  const toggleLike = useMutation(api.likes.toggleLike);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") setIndex((i) => Math.min(i + 1, count - 1));
      if (event.key === "ArrowLeft") setIndex((i) => Math.max(i - 1, 0));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, count]);

  // Keep newest comment in view
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [comments?.length]);

  if (!current) return null;

  async function handleSend(event: FormEvent) {
    event.preventDefault();
    if (!token || sending || text.trim().length === 0) return;
    setSending(true);
    try {
      await addComment({ token, imageId: current._id, text });
      setText("");
    } finally {
      setSending(false);
    }
  }

  async function handleToggleLike() {
    if (!token || pending) return;
    setPending(true);
    try {
      await toggleLike({ token, imageId: current._id });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="overlay !items-stretch !justify-normal">
      <div className="flex h-full w-full flex-col sm:mx-auto sm:max-w-lg">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-xs text-muted">
            <span className="text-pink">{post.isMine ? "You" : post.uploaderName}</span>
            {count > 1 && (
              <span className="ml-2 text-teal">
                {safeIndex + 1} / {count}
              </span>
            )}
          </span>
          <button
            onClick={onClose}
            aria-label="Close"
            className="cursor-pointer p-1 text-2xl leading-none text-pink"
          >
            &times;
          </button>
        </div>

        {/* Image area */}
        <div className="relative flex min-h-0 flex-1 items-center justify-center px-2">
          {current.url && (
            <img
              src={current.url}
              alt={post.name}
              className="max-h-full max-w-full rounded-lg object-contain"
            />
          )}
          {count > 1 && safeIndex > 0 && (
            <button
              onClick={() => setIndex(safeIndex - 1)}
              aria-label="Previous photo"
              className="absolute left-3 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-[rgba(4,4,8,0.6)] text-pink backdrop-blur-sm"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
          )}
          {count > 1 && safeIndex < count - 1 && (
            <button
              onClick={() => setIndex(safeIndex + 1)}
              aria-label="Next photo"
              className="absolute right-3 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-[rgba(4,4,8,0.6)] text-pink backdrop-blur-sm"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          )}
        </div>

        {/* Dots */}
        {count > 1 && (
          <div className="flex justify-center gap-1.5 py-2">
            {post.images.map((image, i) => (
              <button
                key={image._id}
                onClick={() => setIndex(i)}
                aria-label={`Photo ${i + 1}`}
                className={`h-1.5 cursor-pointer rounded-full transition-all ${
                  i === safeIndex ? "w-5 bg-pink" : "w-1.5 bg-muted opacity-50"
                }`}
              />
            ))}
          </div>
        )}

        {/* Likes + comments for the CURRENT photo */}
        <div className="card mx-2 mb-2 flex max-h-[40%] flex-col rounded-b-none border-b-0 sm:rounded-2xl sm:border-b">
          <div className="flex items-center gap-3 border-b border-line px-4 py-2.5">
            <button
              onClick={handleToggleLike}
              disabled={pending}
              aria-label={current.likedByMe ? "Unlike" : "Like"}
              className="cursor-pointer"
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill={current.likedByMe ? "#ff5c8a" : "none"}
                stroke={current.likedByMe ? "#ff5c8a" : "#8b8794"}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
              </svg>
            </button>
            <button
              onClick={() => onShowLikers(current)}
              className="cursor-pointer text-sm text-teal"
            >
              {current.likeCount} {current.likeCount === 1 ? "like" : "likes"}
            </button>
            {count > 1 && (
              <span className="ml-auto text-[0.65rem] uppercase tracking-wider text-muted">
                Photo {safeIndex + 1}
              </span>
            )}
          </div>

          <ul ref={listRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-2">
            {comments === undefined ? (
              <li className="flex justify-center py-3">
                <div className="spinner-teal" />
              </li>
            ) : comments.length === 0 ? (
              <li className="py-3 text-center text-xs text-muted">
                No comments on this photo yet — say something nice
              </li>
            ) : (
              comments.map((comment) => (
                <li key={comment._id} className="group flex items-baseline gap-2 py-1.5">
                  <span className="shrink-0 text-xs font-semibold text-pink">
                    {comment.username}
                  </span>
                  <span className="min-w-0 flex-1 break-words text-sm">{comment.text}</span>
                  <span className="shrink-0 text-[0.65rem] text-muted">
                    {timeAgo(comment.createdAt)}
                  </span>
                  {comment.isMine && token && (
                    <button
                      onClick={() => removeComment({ token, commentId: comment._id })}
                      aria-label="Delete comment"
                      className="shrink-0 cursor-pointer text-xs text-muted opacity-0 transition-opacity hover:text-hot group-hover:opacity-100"
                    >
                      &times;
                    </button>
                  )}
                </li>
              ))
            )}
          </ul>

          <form onSubmit={handleSend} className="flex gap-2 border-t border-line p-2.5">
            <input
              className="input-dark !rounded-full !py-2 text-sm"
              type="text"
              placeholder="Add a comment…"
              value={text}
              maxLength={300}
              onChange={(e) => setText(e.target.value)}
            />
            <button
              type="submit"
              disabled={sending || text.trim().length === 0}
              aria-label="Send comment"
              className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center self-center rounded-full bg-gradient-to-br from-pink to-hot text-bg disabled:opacity-40"
            >
              {sending ? (
                <span className="spinner !h-4 !w-4" />
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m22 2-7 20-4-9-9-4Z" />
                  <path d="M22 2 11 13" />
                </svg>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
