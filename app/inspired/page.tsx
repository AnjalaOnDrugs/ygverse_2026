"use client";

import { useMutation, useQuery } from "convex/react";
import { useEffect, useRef, useState } from "react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/components/AuthProvider";

// Taps show up on screen instantly; every FLUSH_MS the accumulated count
// is sent as one mutation, so frantic tapping never queues per-click calls.
const FLUSH_MS = 600;
const TOP_SPOTS = 3;

export default function InspiredPage() {
  const { token } = useAuth();
  const board = useQuery(api.inspired.board, token ? { token } : "skip");
  const like = useMutation(api.inspired.like);

  const [search, setSearch] = useState("");
  // Taps the server hasn't confirmed yet, per attendee. Added on click,
  // removed once the batch mutation settles (the board query then carries
  // them), so displayed count = server count + local count with no dips.
  const [localCounts, setLocalCounts] = useState<Record<string, number>>({});
  const pendingRef = useRef(new Map<Id<"users">, number>());
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tokenRef = useRef(token);
  tokenRef.current = token;

  const flush = () => {
    flushTimer.current = null;
    const authToken = tokenRef.current;
    if (!authToken) return;
    const batch = [...pendingRef.current.entries()];
    pendingRef.current.clear();
    for (const [targetId, count] of batch) {
      like({ token: authToken, targetId, count })
        .catch(() => {
          // Dropped taps just fall out of the local total below.
        })
        .finally(() => {
          setLocalCounts((current) => {
            const left = (current[targetId] ?? 0) - count;
            const next = { ...current };
            if (left > 0) next[targetId] = left;
            else delete next[targetId];
            return next;
          });
        });
    }
  };
  const flushRef = useRef(flush);
  flushRef.current = flush;

  // Push out whatever is still buffered when the user leaves the page.
  useEffect(() => {
    return () => {
      if (flushTimer.current) clearTimeout(flushTimer.current);
      flushRef.current();
    };
  }, []);

  const tap = (id: Id<"users">) => {
    pendingRef.current.set(id, (pendingRef.current.get(id) ?? 0) + 1);
    setLocalCounts((current) => ({ ...current, [id]: (current[id] ?? 0) + 1 }));
    if (!flushTimer.current) {
      flushTimer.current = setTimeout(() => flushRef.current(), FLUSH_MS);
    }
  };

  if (!token || board === undefined) {
    return (
      <div className="flex items-center justify-center py-28">
        <div className="spinner-teal" />
      </div>
    );
  }

  const withLocal = board.map((row) => ({
    ...row,
    count: row.count + (localCounts[row.id] ?? 0),
  }));

  const top = withLocal
    .filter((row) => row.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, TOP_SPOTS);

  // The tap list stays alphabetical so rows don't reshuffle mid-tap.
  const query = search.trim().toLowerCase();
  const list = withLocal
    .filter((row) => !query || row.username.toLowerCase().includes(query))
    .sort((a, b) => a.username.localeCompare(b.username));

  return (
    <div className="rise-in flex flex-col gap-6 py-6">
      <div className="text-center">
        <p className="font-display neon-logo text-3xl font-bold">INSPIRED</p>
        <p className="mx-auto mt-2 max-w-xs text-sm text-muted">
          Someone&apos;s walking the runway? Smash their heart — no limits,
          every single tap counts.
        </p>
      </div>

      {top.length > 0 && (
        <section>
          <p className="mb-3 text-xs uppercase tracking-widest text-muted">
            Most inspiring
          </p>
          <ul className="flex flex-col gap-3">
            {top.map((row, i) => (
              <li
                key={row.id}
                className={`card flex items-center gap-4 p-4 ${
                  i === 0 ? "glow-pink" : ""
                }`}
              >
                <span
                  className={`font-display w-7 shrink-0 text-center text-lg font-bold ${
                    i === 0 ? "text-pink" : "text-muted"
                  }`}
                >
                  {i + 1}
                </span>
                <p className="min-w-0 flex-1 truncate font-semibold text-ink">
                  {row.username}
                  {row.isMe && <span className="ml-2 text-xs text-teal">You</span>}
                </p>
                <HeartCount count={row.count} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <p className="mb-3 text-xs uppercase tracking-widest text-muted">
          On the runway
        </p>
        <input
          className="input-dark mb-3"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Find who's walking…"
        />
        {list.length === 0 ? (
          <p className="card p-6 text-center text-sm text-muted">
            No one matches that name.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {list.map((row) => (
              <li key={row.id} className="card flex items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-ink">
                    {row.username}
                    {row.isMe && (
                      <span className="ml-2 text-xs text-teal">You</span>
                    )}
                  </p>
                </div>
                <HeartCount count={row.count} />
                {!row.isMe && (
                  <button
                    onClick={() => tap(row.id)}
                    aria-label={`Send a heart to ${row.username}`}
                    className="shrink-0 cursor-pointer touch-manipulation select-none rounded-full border border-hot/40 bg-hot/10 p-3 text-pink transition-transform active:scale-90"
                  >
                    <HeartIcon filled />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/** Re-mounts on every change so the pop animation replays per tap. */
function HeartCount({ count }: { count: number }) {
  if (count === 0) {
    return <span className="shrink-0 text-sm text-muted">—</span>;
  }
  return (
    <span
      key={count}
      className="heart-pop flex shrink-0 items-center gap-1.5 font-display text-lg font-bold text-teal"
    >
      {count}
    </span>
  );
}

function HeartIcon({ filled }: { filled?: boolean }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21.2l7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.8Z" />
    </svg>
  );
}
