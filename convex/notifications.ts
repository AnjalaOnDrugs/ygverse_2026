import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser } from "./lib/auth";

export const list = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const user = await requireUser(ctx, token);
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(30);
    return await Promise.all(
      notifications.map(async (notification) => {
        const [actor, image] = await Promise.all([
          ctx.db.get(notification.actorId),
          ctx.db.get(notification.imageId),
        ]);
        return {
          _id: notification._id,
          actorName: actor?.username ?? "Someone",
          read: notification.read,
          createdAt: notification._creationTime,
          thumbUrl: image ? await ctx.storage.getUrl(image.storageId) : null,
        };
      })
    );
  },
});

export const unreadCount = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const user = await requireUser(ctx, token);
    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user_read", (q) =>
        q.eq("userId", user._id).eq("read", false)
      )
      .collect();
    return unread.length;
  },
});

export const markAllRead = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const user = await requireUser(ctx, token);
    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user_read", (q) =>
        q.eq("userId", user._id).eq("read", false)
      )
      .collect();
    await Promise.all(
      unread.map((notification) =>
        ctx.db.patch(notification._id, { read: true })
      )
    );
  },
});
