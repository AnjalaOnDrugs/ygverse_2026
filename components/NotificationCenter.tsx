"use client";

/* eslint-disable @next/next/no-img-element -- tiny thumbnails from Convex storage */

import { useMutation, useQuery } from "convex/react";
import { useEffect, useRef, useState } from "react";
import { api } from "@/convex/_generated/api";
import { timeAgo } from "@/lib/timeAgo";
import { useAuth } from "./AuthProvider";

export function NotificationCenter() {
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<{
    key: number;
    text: string;
    thumbUrl: string | null;
  } | null>(null);
  // Ids that were unread when the panel opened, so highlights survive markAllRead
  const [highlighted, setHighlighted] = useState<Set<string>>(new Set());
  const wrapRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);
  const lastSeenIdRef = useRef<string>("");
  const mountTimeRef = useRef(Date.now());

  const notifications = useQuery(
    api.notifications.list,
    token ? { token } : "skip"
  );
  const unreadCount = useQuery(
    api.notifications.unreadCount,
    token ? { token } : "skip"
  );
  const markAllRead = useMutation(api.notifications.markAllRead);

  // Quiet toast when a new like arrives while the app is open
  useEffect(() => {
    if (!notifications) return;
    const latest = notifications[0];
    if (!initializedRef.current) {
      initializedRef.current = true;
      lastSeenIdRef.current = latest?._id ?? "";
      return;
    }
    if (
      latest &&
      latest._id !== lastSeenIdRef.current &&
      !latest.read &&
      latest.createdAt > mountTimeRef.current
    ) {
      setToast({
        key: latest.createdAt,
        text: `${latest.actorName} liked your photo`,
        thumbUrl: latest.thumbUrl,
      });
    }
    lastSeenIdRef.current = latest?._id ?? "";
  }, [notifications]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4100);
    return () => clearTimeout(timer);
  }, [toast]);

  // Close panel on outside click
  useEffect(() => {
    if (!open) return;
    function onClick(event: MouseEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  function togglePanel() {
    if (!open) {
      setHighlighted(
        new Set((notifications ?? []).filter((n) => !n.read).map((n) => n._id))
      );
      if (token && (unreadCount ?? 0) > 0) markAllRead({ token });
    }
    setOpen(!open);
  }

  return (
    // Not position:relative — the panel anchors to the sticky header
    // (nearest positioned ancestor) so it stays on-screen instead of
    // overflowing past the left edge on phones.
    <div ref={wrapRef}>
      <button
        onClick={togglePanel}
        aria-label={`Notifications${unreadCount ? ` (${unreadCount} unread)` : ""}`}
        className="relative flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-muted transition-colors hover:text-pink"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {(unreadCount ?? 0) > 0 && (
          <span className="bell-badge">
            {unreadCount! > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="notif-panel card p-2">
          {notifications === undefined ? (
            <div className="flex justify-center py-6">
              <div className="spinner-teal" />
            </div>
          ) : notifications.length === 0 ? (
            <p className="px-3 py-5 text-center text-sm text-muted">
              No notifications yet
            </p>
          ) : (
            <ul>
              {notifications.map((notification) => (
                <li
                  key={notification._id}
                  className="flex items-center gap-3 rounded-xl px-2 py-2"
                >
                  {notification.thumbUrl ? (
                    <img
                      src={notification.thumbUrl}
                      alt=""
                      className="h-9 w-9 shrink-0 rounded-lg object-cover"
                    />
                  ) : (
                    <span className="h-9 w-9 shrink-0 rounded-lg bg-raised" />
                  )}
                  <span className="flex-1 text-sm leading-tight">
                    <span className="text-pink">{notification.actorName}</span>{" "}
                    liked your photo
                    <span className="mt-0.5 block text-xs text-muted">
                      {timeAgo(notification.createdAt)}
                    </span>
                  </span>
                  {highlighted.has(notification._id) && (
                    <span className="h-2 w-2 shrink-0 rounded-full bg-hot" />
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {toast && (
        <div
          key={toast.key}
          className="push-toast"
          role="status"
          onClick={() => setToast(null)}
        >
          {toast.thumbUrl && <img src={toast.thumbUrl} alt="" />}
          <svg className="shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="#ff5c8a">
            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
          </svg>
          <span className="truncate">{toast.text}</span>
        </div>
      )}
    </div>
  );
}
