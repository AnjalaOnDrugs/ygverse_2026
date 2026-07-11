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
