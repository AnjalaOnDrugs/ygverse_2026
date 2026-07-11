import { internalMutation } from "./_generated/server";

/**
 * Wipe all posted content (posts, images, likes, comments, notifications)
 * and their storage blobs. Users and sessions are kept — useful for
 * clearing test data before the event. Run with:
 *   npx convex run admin:wipeContent
 */
export const wipeContent = internalMutation({
  args: {},
  handler: async (ctx) => {
    const images = await ctx.db.query("images").collect();
    for (const image of images) {
      await ctx.storage.delete(image.storageId);
      await ctx.db.delete(image._id);
    }
    let rows = 0;
    for (const table of ["posts", "likes", "comments", "notifications"] as const) {
      const docs = await ctx.db.query(table).collect();
      for (const doc of docs) await ctx.db.delete(doc._id);
      rows += docs.length;
    }
    return { images: images.length, otherRows: rows };
  },
});
