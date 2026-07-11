import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { requireUser } from "./lib/auth";

// Totals are split across this many counter rows per attendee; each tap
// batch lands on a random shard so simultaneous fans don't collide.
const SHARDS = 8;
// Upper bound on one batched mutation, generous for ~1s of frantic tapping.
const MAX_BATCH = 200;
const MAX_ATTENDEES = 500;

/** Every attendee with their total heart count, most inspiring first. */
export const board = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const me = await requireUser(ctx, token);
    const users = await ctx.db.query("users").take(MAX_ATTENDEES);
    const shards = await ctx.db
      .query("inspiredCounts")
      .take(MAX_ATTENDEES * SHARDS);

    const totals = new Map<Id<"users">, number>();
    for (const row of shards) {
      totals.set(row.targetId, (totals.get(row.targetId) ?? 0) + row.count);
    }

    const board = users.map((user) => ({
      id: user._id,
      username: user.username,
      count: totals.get(user._id) ?? 0,
      isMe: user._id === me._id,
    }));
    board.sort(
      (a, b) => b.count - a.count || a.username.localeCompare(b.username)
    );
    return board;
  },
});

/**
 * Record heart taps for one attendee. Likes are intentionally unlimited —
 * the client counts every click, batches rapid taps locally, and sends the
 * running total here so each tap is counted without one mutation per click.
 */
export const like = mutation({
  args: { token: v.string(), targetId: v.id("users"), count: v.number() },
  handler: async (ctx, { token, targetId, count }) => {
    const user = await requireUser(ctx, token);
    if (targetId === user._id)
      throw new Error("You can't inspire yourself — tap for the walker!");
    const target = await ctx.db.get(targetId);
    if (!target) throw new Error("Attendee not found");

    const taps = Math.min(Math.max(Math.floor(count), 1), MAX_BATCH);
    const shard = Math.floor(Math.random() * SHARDS);
    const existing = await ctx.db
      .query("inspiredCounts")
      .withIndex("by_target_and_shard", (q) =>
        q.eq("targetId", targetId).eq("shard", shard)
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { count: existing.count + taps });
    } else {
      await ctx.db.insert("inspiredCounts", { targetId, shard, count: taps });
    }
  },
});
