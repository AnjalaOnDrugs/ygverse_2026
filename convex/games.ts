import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { MutationCtx } from "./_generated/server";
import { requireUser } from "./lib/auth";

const MAX_GROUP_NAME = 40;
const MAX_GROUPS = 200;
const MAX_MEMBERS_SHOWN = 100;

async function membershipOf(
  ctx: MutationCtx,
  userId: Id<"users">
): Promise<Doc<"groupMembers"> | null> {
  return await ctx.db
    .query("groupMembers")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
}

/** Groups sorted by points (the leaderboard) plus the caller's membership. */
export const list = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const user = await requireUser(ctx, token);
    const groups = await ctx.db.query("groups").take(MAX_GROUPS);

    const mine = await ctx.db
      .query("groupMembers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();

    const detailed = await Promise.all(
      groups.map(async (group) => {
        const memberships = await ctx.db
          .query("groupMembers")
          .withIndex("by_group", (q) => q.eq("groupId", group._id))
          .take(MAX_MEMBERS_SHOWN);
        const users = await Promise.all(
          memberships.map((m) => ctx.db.get(m.userId))
        );
        return {
          id: group._id,
          name: group.name,
          points: group.points,
          members: users
            .filter((u) => u !== null)
            .map((u) => u.username),
        };
      })
    );

    detailed.sort(
      (a, b) => b.points - a.points || a.name.localeCompare(b.name)
    );
    return { groups: detailed, myGroupId: mine?.groupId ?? null };
  },
});

/** Create a group and join it (leaving the current one, if any). */
export const create = mutation({
  args: { token: v.string(), name: v.string() },
  handler: async (ctx, { token, name }) => {
    const user = await requireUser(ctx, token);
    const trimmed = name.trim();
    if (!trimmed) throw new Error("Give your group a name");
    if (trimmed.length > MAX_GROUP_NAME)
      throw new Error(`Group names max ${MAX_GROUP_NAME} characters`);

    const duplicate = await ctx.db
      .query("groups")
      .withIndex("by_name", (q) => q.eq("name", trimmed))
      .unique();
    if (duplicate) throw new Error("A group with that name already exists");

    const groupId = await ctx.db.insert("groups", {
      name: trimmed,
      points: 0,
      createdBy: user._id,
    });

    const existing = await membershipOf(ctx, user._id);
    if (existing) {
      await ctx.db.patch(existing._id, { groupId });
    } else {
      await ctx.db.insert("groupMembers", { groupId, userId: user._id });
    }
    return { groupId };
  },
});

/** Join a group, switching from the current one if needed. */
export const join = mutation({
  args: { token: v.string(), groupId: v.id("groups") },
  handler: async (ctx, { token, groupId }) => {
    const user = await requireUser(ctx, token);
    const group = await ctx.db.get(groupId);
    if (!group) throw new Error("That group no longer exists");

    const existing = await membershipOf(ctx, user._id);
    if (existing?.groupId === groupId) return;
    if (existing) {
      await ctx.db.patch(existing._id, { groupId });
    } else {
      await ctx.db.insert("groupMembers", { groupId, userId: user._id });
    }
  },
});

export const leave = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const user = await requireUser(ctx, token);
    const existing = await membershipOf(ctx, user._id);
    if (existing) await ctx.db.delete(existing._id);
  },
});

/**
 * Organizer-only: add (or subtract, with a negative delta) points.
 * Run from the dashboard or CLI:
 *   npx convex run games:adjustPoints '{"groupId": "...", "delta": 10}'
 */
export const adjustPoints = internalMutation({
  args: { groupId: v.id("groups"), delta: v.number() },
  handler: async (ctx, { groupId, delta }) => {
    const group = await ctx.db.get(groupId);
    if (!group) throw new Error("Group not found");
    const points = Math.max(0, group.points + delta);
    await ctx.db.patch(groupId, { points });
    return { name: group.name, points };
  },
});
