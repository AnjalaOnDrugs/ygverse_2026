"use client";

import { useMutation } from "convex/react";
import { ChangeEvent, useRef, useState } from "react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/components/AuthProvider";

const MAX_SIZE_MB = 10;
const MAX_FILES = 10;

export function UploadButton() {
  const { token } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState("");
  const generateUploadUrl = useMutation(api.posts.generateUploadUrl);
  const createPost = useMutation(api.posts.createPost);

  async function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0 || !token) return;

    setError("");
    if (files.length > MAX_FILES) {
      setError(`You can upload at most ${MAX_FILES} photos at once`);
      return;
    }
    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        setError("Only images can be uploaded");
        return;
      }
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        setError(`"${file.name}" is too big (max ${MAX_SIZE_MB} MB each)`);
        return;
      }
    }

    setProgress({ done: 0, total: files.length });
    try {
      const storageIds: Id<"_storage">[] = [];
      for (const file of files) {
        const uploadUrl = await generateUploadUrl({ token });
        const response = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });
        if (!response.ok) throw new Error("Upload failed");
        const { storageId } = (await response.json()) as {
          storageId: Id<"_storage">;
        };
        storageIds.push(storageId);
        setProgress({ done: storageIds.length, total: files.length });
      }
      await createPost({ token, storageIds, name: files[0].name });
    } catch {
      setError("Upload failed — please try again");
    } finally {
      setProgress(null);
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFiles}
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={progress !== null}
        aria-label="Upload photos"
        className="glow-pink fixed bottom-24 right-5 z-40 flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-gradient-to-br from-pink to-hot text-bg transition-transform hover:scale-105 disabled:opacity-70 md:right-[max(1.25rem,calc((100vw-48rem)/2+1.25rem))]"
      >
        {progress ? (
          <span className="text-xs font-bold">
            {progress.done}/{progress.total}
          </span>
        ) : (
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        )}
      </button>
      {error && (
        <p className="fixed bottom-[10.5rem] right-5 z-40 max-w-[70vw] rounded-lg bg-card px-3 py-2 text-xs text-hot md:right-[max(1.25rem,calc((100vw-48rem)/2+1.25rem))]" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
