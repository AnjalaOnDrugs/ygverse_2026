"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/components/AuthProvider";
import { PostImage } from "./types";

export function LikesModal({
  image,
  onClose,
}: {
  image: PostImage;
  onClose: () => void;
}) {
  const { token } = useAuth();
  const likers = useQuery(
    api.likes.likers,
    token ? { token, imageId: image._id } : "skip"
  );

  return (
    <div className="overlay !z-[70]" onClick={onClose}>
      <div
        className="card rise-in mx-6 w-full max-w-sm p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-sm tracking-wide text-teal">
            Liked by
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="cursor-pointer text-xl leading-none text-pink"
          >
            &times;
          </button>
        </div>

        {likers === undefined ? (
          <div className="flex justify-center py-6">
            <div className="spinner-teal" />
          </div>
        ) : likers.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted">No likes yet</p>
        ) : (
          <ul className="max-h-72 overflow-y-auto">
            {likers.map((liker) => (
              <li
                key={liker.regNo}
                className="flex items-center gap-3 border-b border-line py-2.5 last:border-b-0"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-pink to-teal font-display text-xs text-bg">
                  {liker.username.charAt(0).toUpperCase()}
                </span>
                <span className="text-sm">{liker.username}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
