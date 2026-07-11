import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser } from "./lib/auth";

const MAX_COMMENT_LENGTH = 300;

export const add = mutation({
  args: { token: v.string(), imageId: v.id("images"), text: v.string() },
  handler: async (ctx, { token, imageId, text }) => {
    const user = await requireUser(ctx, token);
    const image = await ctx.db.get(imageId);
    if (!image) throw new Error("Photo not found");

    const trimmed = text.trim();
    if (trimmed.length === 0) throw new Error("Comment is empty");
    if (trimmed.length > MAX_COMMENT_LENGTH) {
      throw new Error(`Comments are limited to ${MAX_COMMENT_LENGTH} characters`);
    }
    await ctx.db.insert("comments", {
      imageId,
      userId: user._id,
      text: trimmed,
    });
  },
});

export const list = query({
  args: { token: v.string(), imageId: v.id("images") },
  handler: async (ctx, { token, imageId }) => {
    const me = await requireUser(ctx, token);
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_image", (q) => q.eq("imageId", imageId))
      .collect();
    return await Promise.all(
      comments.map(async (comment) => {
        const author = await ctx.db.get(comment.userId);
        return {
          _id: comment._id,
          text: comment.text,
          createdAt: comment._creationTime,
          username: author?.username ?? "Probably a yg stan",
          isMine: comment.userId === me._id,
        };
      })
    );
  },
});

export const remove = mutation({
  args: { token: v.string(), commentId: v.id("comments") },
  handler: async (ctx, { token, commentId }) => {
    const user = await requireUser(ctx, token);
    const comment = await ctx.db.get(commentId);
    if (!comment) return;
    if (comment.userId !== user._id) {
      throw new Error("You can only delete your own comments");
    }
    await ctx.db.delete(commentId);
  },
});
