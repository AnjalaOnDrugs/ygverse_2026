"use client";

import { useMutation, useQuery } from "convex/react";
import { FormEvent, useState } from "react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/components/AuthProvider";

export default function GamesPage() {
  const { token } = useAuth();
  const data = useQuery(api.games.list, token ? { token } : "skip");

  const createGroup = useMutation(api.games.create);
  const joinGroup = useMutation(api.games.join);
  const leaveGroup = useMutation(api.games.leave);

  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!token || data === undefined) {
    return (
      <div className="flex items-center justify-center py-28">
        <div className="spinner-teal" />
      </div>
    );
  }

  const { groups, myGroupId } = data;
  const myGroup = groups.find((g) => g.id === myGroupId) ?? null;
  const myRank = myGroup ? groups.indexOf(myGroup) + 1 : null;

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(cleanError(err));
    } finally {
      setBusy(false);
    }
  };

  const onCreate = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    run(async () => {
      await createGroup({ token, name });
      setName("");
    });
  };

  return (
    <div className="rise-in flex flex-col gap-6 py-6">
      <div className="text-center">
        <p className="font-display neon-logo text-3xl font-bold">GAMES</p>
        <p className="mt-2 text-sm text-muted">
          Team up, play the stations, climb the board.
        </p>
      </div>

      {error && (
        <p className="rounded-xl border border-hot/40 bg-hot/10 px-4 py-3 text-center text-sm text-pink">
          {error}
        </p>
      )}

      {myGroup ? (
        <section className="card glow-pink p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted">
                Your team · #{myRank} on the board
              </p>
              <p className="font-display mt-1 text-xl font-bold text-pink">
                {myGroup.name}
              </p>
            </div>
            <div className="text-right">
              <p className="font-display text-2xl font-bold text-teal">
                {myGroup.points}
              </p>
              <p className="text-xs text-muted">points</p>
            </div>
          </div>
          <MemberChips members={myGroup.members} />
          <button
            onClick={() => run(() => leaveGroup({ token }))}
            disabled={busy}
            className="btn-ghost mt-4 cursor-pointer"
          >
            Leave team
          </button>
        </section>
      ) : (
        <form onSubmit={onCreate} className="card p-5">
          <p className="font-display text-sm font-bold text-ink">
            Start a new team
          </p>
          <div className="mt-3 flex gap-2">
            <input
              className="input-dark"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Team name"
              maxLength={40}
            />
            <button
              type="submit"
              disabled={busy || !name.trim()}
              className="btn-neon shrink-0 cursor-pointer"
            >
              Create
            </button>
          </div>
        </form>
      )}

      <section>
        <p className="mb-3 text-xs uppercase tracking-widest text-muted">
          Leaderboard
        </p>
        {groups.length === 0 ? (
          <p className="card p-6 text-center text-sm text-muted">
            No teams yet — be the first to create one!
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {groups.map((group, i) => (
              <li key={group.id} className="card flex items-center gap-4 p-4">
                <span
                  className={`font-display w-7 shrink-0 text-center text-lg font-bold ${
                    i === 0 ? "text-pink" : "text-muted"
                  }`}
                >
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-ink">
                    {group.name}
                    {group.id === myGroupId && (
                      <span className="ml-2 text-xs text-teal">You</span>
                    )}
                  </p>
                  <p className="truncate text-xs text-muted">
                    {group.members.length}{" "}
                    {group.members.length === 1 ? "member" : "members"}
                    {group.members.length > 0 && (
                      <> · {group.members.join(", ")}</>
                    )}
                  </p>
                </div>
                <span className="font-display shrink-0 text-lg font-bold text-teal">
                  {group.points}
                </span>
                {group.id !== myGroupId && (
                  <button
                    onClick={() =>
                      run(() =>
                        joinGroup({ token, groupId: group.id as Id<"groups"> })
                      )
                    }
                    disabled={busy}
                    className="btn-ghost shrink-0 cursor-pointer"
                  >
                    {myGroupId ? "Switch" : "Join"}
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

function MemberChips({ members }: { members: string[] }) {
  if (members.length === 0) return null;
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {members.map((username) => (
        <span
          key={username}
          className="rounded-full border border-line bg-raised px-3 py-1 text-xs text-ink"
        >
          {username}
        </span>
      ))}
    </div>
  );
}

/** Convex wraps thrown errors; keep just the human-readable part. */
function cleanError(err: unknown): string {
  const text = String(err instanceof Error ? err.message : err);
  const match = text.match(/Error: (.*?)(?:\n| at )/);
  return match ? match[1] : text;
}
