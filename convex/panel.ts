import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { query } from "./_generated/server";

// Read-only query used by the YGVERSE event control panel to spotlight
// the most liked photos on the projector. Exposes only image URLs, like
// counts and uploader names — no tokens or account data.
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
