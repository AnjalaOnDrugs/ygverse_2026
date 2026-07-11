import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser } from "./lib/auth";

export const toggleLike = mutation({
  args: { token: v.string(), imageId: v.id("images") },
  handler: async (ctx, { token, imageId }) => {
    const user = await requireUser(ctx, token);
    const image = await ctx.db.get(imageId);
    if (!image) throw new Error("Photo not found");
    const post = await ctx.db.get(image.postId);
    if (!post) throw new Error("Post not found");

    const existing = await ctx.db
      .query("likes")
      .withIndex("by_image_user", (q) =>
        q.eq("imageId", imageId).eq("userId", user._id)
      )
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
      // Retract the notification so the owner doesn't see a stale like
      const stale = await ctx.db
        .query("notifications")
        .withIndex("by_image", (q) => q.eq("imageId", imageId))
        .filter((q) => q.eq(q.field("actorId"), user._id))
        .collect();
      await Promise.all(stale.map((n) => ctx.db.delete(n._id)));
      return { liked: false };
    }

    await ctx.db.insert("likes", { imageId, userId: user._id });
    if (post.userId !== user._id) {
      await ctx.db.insert("notifications", {
        userId: post.userId,
        actorId: user._id,
        type: "like",
        imageId,
        read: false,
      });
    }
    return { liked: true };
  },
});

export const likers = query({
  args: { token: v.string(), imageId: v.id("images") },
  handler: async (ctx, { token, imageId }) => {
    await requireUser(ctx, token);
    const likes = await ctx.db
      .query("likes")
      .withIndex("by_image", (q) => q.eq("imageId", imageId))
      .collect();
    const users = await Promise.all(
      likes.map((like) => ctx.db.get(like.userId))
    );
    return users
      .filter((user) => user !== null)
      .map((user) => ({ username: user.username, regNo: user.regNo }));
  },
});
