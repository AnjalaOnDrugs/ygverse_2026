import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";

// Endpoints used by the YGVERSE event control panel. topLiked spotlights
// the most liked photos on the projector and exposes only image URLs, like
// counts and uploader names — no tokens or account data. deletePhoto lets
// the organizer moderate any attendee photo.
export const topLiked = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const max = Math.min(limit ?? 8, 24);

    const likes = await ctx.db.query("likes").collect();
    const counts = new Map<Id<"images">, number>();
    for (const like of likes) {
      counts.set(like.imageId, (counts.get(like.imageId) ?? 0) + 1);
    }

    const ranked = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, max);

    const results = [];
    for (const [imageId, likeCount] of ranked) {
      const image = await ctx.db.get(imageId);
      if (!image) continue;
      const url = await ctx.storage.getUrl(image.storageId);
      if (!url) continue;
      const post = await ctx.db.get(image.postId);
      const uploader = post ? await ctx.db.get(post.userId) : null;
      results.push({
        imageId,
        url,
        likeCount,
        postName: post?.name ?? "",
        uploaderName: uploader?.username ?? "",
      });
    }
    return results;
  },
});

// Groups sorted by points, for the panel's Groups tab and the projector
// leaderboard. Read-only: names, points and member counts only.
export const groups = query({
  args: {},
  handler: async (ctx) => {
    const groups = await ctx.db.query("groups").take(200);
    const detailed = await Promise.all(
      groups.map(async (group) => {
        const members = await ctx.db
          .query("groupMembers")
          .withIndex("by_group", (q) => q.eq("groupId", group._id))
          .collect();
        return {
          groupId: group._id,
          name: group.name,
          points: group.points,
          memberCount: members.length,
        };
      })
    );
    detailed.sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));
    return detailed;
  },
});

// Adjusts a group's score on behalf of the event organizer (points are
// awarded from the control panel during games). Unauthenticated by choice,
// same as deletePhoto — the organizer accepts that anyone with the
// deployment URL could call this.
export const adjustPoints = mutation({
  args: { groupId: v.id("groups"), delta: v.number() },
  handler: async (ctx, { groupId, delta }) => {
    const group = await ctx.db.get(groupId);
    if (!group) throw new Error("Group not found");
    const points = Math.max(0, group.points + delta);
    await ctx.db.patch(groupId, { points });
    return { name: group.name, points };
  },
});

// Deletes one photo on behalf of the event organizer (moderation from the
// control panel). Unauthenticated by choice — the organizer accepts that
// anyone with the deployment URL could call this.
export const deletePhoto = mutation({
  args: { imageId: v.id("images") },
  handler: async (ctx, { imageId }) => {
    const image = await ctx.db.get(imageId);
    if (!image) return;

    for (const table of ["likes", "comments", "notifications"] as const) {
      const rows = await ctx.db
        .query(table)
        .withIndex("by_image", (q) => q.eq("imageId", imageId))
        .collect();
      await Promise.all(rows.map((row) => ctx.db.delete(row._id)));
    }
    await ctx.storage.delete(image.storageId);
    await ctx.db.delete(image._id);

    // A post whose last image was removed is an empty shell — drop it too.
    const remaining = await ctx.db
      .query("images")
      .withIndex("by_post", (q) => q.eq("postId", image.postId))
      .first();
    if (!remaining) await ctx.db.delete(image.postId);
  },
});

// Returns all users for the Runway performer dropdown in the control panel.
export const getInspiredUsers = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    return users.map((u) => ({ id: u._id, username: u.username }));
  },
});

// Queries the total heart count for a specific Runway performer.
export const getInspiredCount = query({
  args: { targetId: v.id("users") },
  handler: async (ctx, { targetId }) => {
    const shards = await ctx.db
      .query("inspiredCounts")
      .withIndex("by_target_and_shard", (q) => q.eq("targetId", targetId))
      .collect();
    let total = 0;
    for (const shard of shards) {
      total += shard.count;
    }
    return total;
  },
});

// Sets the currently active walker on the runway.
export const setActiveWalker = mutation({
  args: { userId: v.union(v.id("users"), v.null()) },
  handler: async (ctx, { userId }) => {
    const existing = await ctx.db.query("activeWalker").collect();
    for (const doc of existing) {
      await ctx.db.delete(doc._id);
    }
    if (userId) {
      await ctx.db.insert("activeWalker", { userId });
    }
  },
});

// Returns details of the currently active walker.
export const getActiveWalker = query({
  args: {},
  handler: async (ctx) => {
    const doc = await ctx.db.query("activeWalker").first();
    if (!doc || !doc.userId) return null;
    const user = await ctx.db.get(doc.userId);
    if (!user) return null;
    return { id: user._id, username: user.username };
  },
});

