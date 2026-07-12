"use client";

import { useMutation, useQuery } from "convex/react";
import { useEffect, useRef, useState } from "react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/components/AuthProvider";

// Taps show up on screen instantly; every FLUSH_MS the accumulated count
// is sent as one mutation.
const FLUSH_MS = 600;

interface FloatingHeart {
  id: number;
  x: number;
}

export default function InspiredPage() {
  const { token } = useAuth();
  const board = useQuery(api.inspired.board, token ? { token } : "skip");
  const activeWalker = useQuery(api.panel.getActiveWalker);
  const like = useMutation(api.inspired.like);

  const [localCounts, setLocalCounts] = useState<Record<string, number>>({});
  const [tapHearts, setTapHearts] = useState<FloatingHeart[]>([]);
  const heartIdCounter = useRef(0);
  const pendingRef = useRef(new Map<Id<"users">, number>());
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tokenRef = useRef(token);
  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  const flush = () => {
    flushTimer.current = null;
    const authToken = tokenRef.current;
    if (!authToken) return;
    const batch = [...pendingRef.current.entries()];
    pendingRef.current.clear();
    for (const [targetId, count] of batch) {
      like({ token: authToken, targetId, count })
        .catch(() => {})
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
  useEffect(() => {
    flushRef.current = flush;
  }, [flush]);

  useEffect(() => {
    return () => {
      if (flushTimer.current) clearTimeout(flushTimer.current);
      flushRef.current();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tap = (id: Id<"users">) => {
    pendingRef.current.set(id, (pendingRef.current.get(id) ?? 0) + 1);
    setLocalCounts((current) => ({ ...current, [id]: (current[id] ?? 0) + 1 }));
    
    // Spawn floating heart
    const newHeart = {
      id: heartIdCounter.current++,
      x: 10 + Math.random() * 80, // random horizontal offset in percentage
    };
    setTapHearts((prev) => [...prev, newHeart]);

    if (!flushTimer.current) {
      flushTimer.current = setTimeout(() => flushRef.current(), FLUSH_MS);
    }
  };

  const removeHeart = (id: number) => {
    setTapHearts((prev) => prev.filter((h) => h.id !== id));
  };

  if (!token || board === undefined) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="spinner-teal animate-spin rounded-full h-8 w-8 border-t-2 border-teal" />
      </div>
    );
  }

  // Waiting screen if no active walker
  if (!activeWalker) {
    return (
      <div className="rise-in flex flex-col justify-center items-center text-center px-6 py-20 min-h-[75vh] relative overflow-hidden">
        {/* Subtle glowing radial background */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(100,116,139,0.1),transparent_60%)] pointer-events-none" />
        
        <div className="relative z-10 flex flex-col items-center gap-6">
          {/* Closed crown or model icon */}
          <div className="w-24 h-24 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center shadow-lg animate-pulse">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-slate-400" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
            </svg>
          </div>
          
          <h1 className="font-display text-2xl font-bold tracking-wider text-slate-300">RUNWAY CLOSED</h1>
          <p className="max-w-xs text-sm text-muted">
            The runway is currently empty. Get ready to tap hearts for the next walker as soon as they step out!
          </p>
        </div>
      </div>
    );
  }

  // active walker info
  const walkerRow = board.find((row) => row.id === activeWalker.id);
  const currentTotal = (walkerRow?.count ?? 0) + (localCounts[activeWalker.id] ?? 0);
  const isMe = activeWalker.id === board.find((row) => row.isMe)?.id;

  return (
    <div className="rise-in flex flex-col justify-between items-center text-center px-6 py-8 min-h-[78vh] relative overflow-hidden">
      {/* Dynamic colorful radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,45,120,0.15),transparent_60%)] pointer-events-none" />

      {/* Floating Hearts Container */}
      <div className="absolute inset-0 pointer-events-none z-20">
        {tapHearts.map((heart) => (
          <span
            key={heart.id}
            onAnimationEnd={() => removeHeart(heart.id)}
            style={{ left: `${heart.x}%` }}
            className="absolute bottom-16 text-pink text-3xl opacity-0 animate-[floatUpPhone_1.5s_ease-out_forwards] pointer-events-none select-none"
          >
            &#10084;
          </span>
        ))}
      </div>

      {/* Top Section */}
      <div className="relative z-10 flex flex-col items-center gap-1.5 mt-2">
        <div className="flex items-center gap-2 bg-pink/10 border border-pink/30 rounded-full px-4 py-1.5 text-xs text-pink font-bold uppercase tracking-widest animate-pulse">
          <span className="w-2 h-2 rounded-full bg-pink" />
          Runway Live
        </div>
        <p className="text-xs text-muted mt-2 tracking-widest uppercase">Walking Now</p>
        <h1 className="font-display text-4xl font-extrabold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-white via-pink-soft to-white drop-shadow-[0_0_20px_rgba(255,45,120,0.3)] mt-1 uppercase">
          {activeWalker.username}
        </h1>
        {isMe && <span className="text-xs bg-teal/20 text-teal border border-teal/40 rounded px-2 py-0.5 mt-1 font-semibold">That&apos;s You!</span>}
      </div>

      {/* Center Heart Tap Area */}
      <div className="relative z-10 flex flex-col items-center justify-center my-6">
        <button
          onClick={() => !isMe && tap(activeWalker.id)}
          disabled={isMe}
          className={`group relative w-56 h-56 rounded-full flex flex-col justify-center items-center cursor-pointer transition-all duration-300 touch-manipulation select-none active:scale-95 outline-none
            ${isMe 
              ? "bg-slate-900/40 border border-slate-800 cursor-not-allowed text-slate-600" 
              : "bg-gradient-to-br from-pink/20 to-purple-600/10 border-2 border-pink/40 hover:border-pink/80 hover:shadow-[0_0_40px_rgba(255,45,120,0.25)] text-pink"
            }
          `}
        >
          {/* Glassmorphic background blur */}
          <div className="absolute inset-0 rounded-full backdrop-blur-md -z-10" />

          {/* Heart icon */}
          <svg
            className={`w-28 h-28 transform transition-transform duration-200 group-active:scale-110 
              ${isMe ? "text-slate-700" : "text-pink filter drop-shadow-[0_0_15px_rgba(255,45,120,0.4)]"}
            `}
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>

          {!isMe && (
            <span className="absolute bottom-8 text-xs font-semibold uppercase tracking-widest text-pink-soft opacity-60 group-hover:opacity-100 transition-opacity">
              Tap to inspire
            </span>
          )}
        </button>
      </div>

      {/* Bottom Stats Card */}
      <div className="relative z-10 w-full max-w-xs bg-slate-950/60 border border-slate-900 rounded-2xl p-5 backdrop-blur-md flex flex-col items-center gap-1.5 shadow-xl mb-4">
        <p className="text-[10px] text-muted uppercase tracking-widest">Total Runway Score</p>
        <div className="flex items-center gap-2 text-2xl font-black font-display text-teal drop-shadow-[0_0_10px_rgba(45,212,191,0.2)]">
          <span>&#10084;</span>
          <span className="heart-pop" key={currentTotal}>{currentTotal}</span>
        </div>
        {localCounts[activeWalker.id] > 0 && (
          <p className="text-[11px] text-pink-soft font-semibold animate-bounce mt-1">
            You sent +{localCounts[activeWalker.id]} hearts!
          </p>
        )}
      </div>

      {/* Custom floatUpPhone CSS animation */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes floatUpPhone {
          0% {
            transform: translateY(0) scale(0.6) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: 0.9;
          }
          90% {
            opacity: 0.9;
          }
          100% {
            transform: translateY(-50vh) scale(1.4) rotate(15deg);
            opacity: 0;
          }
        }
      `}} />
    </div>
  );
}
