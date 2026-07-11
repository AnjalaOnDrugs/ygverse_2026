import { v } from "convex/values";
import { Doc } from "./_generated/dataModel";
import { mutation, query, QueryCtx } from "./_generated/server";
import { requireUser } from "./lib/auth";

const MAX_IMAGES_PER_POST = 10;

export const generateUploadUrl = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await requireUser(ctx, token);
    return await ctx.storage.generateUploadUrl();
  },
});

export const createPost = mutation({
  args: {
    token: v.string(),
    storageIds: v.array(v.id("_storage")),
    name: v.string(),
  },
  handler: async (ctx, { token, storageIds, name }) => {
    const user = await requireUser(ctx, token);
    if (storageIds.length === 0) throw new Error("No images in post");
    if (storageIds.length > MAX_IMAGES_PER_POST) {
      throw new Error(`A post can hold at most ${MAX_IMAGES_PER_POST} images`);
    }
    const postId = await ctx.db.insert("posts", { userId: user._id, name });
    for (let i = 0; i < storageIds.length; i++) {
      await ctx.db.insert("images", {
        postId,
        storageId: storageIds[i],
        position: i,
      });
    }
  },
});

async function enrichImage(
  ctx: QueryCtx,
  image: Doc<"images">,
  me: Doc<"users">
) {
  const [likes, comments, url] = await Promise.all([
    ctx.db
      .query("likes")
      .withIndex("by_image", (q) => q.eq("imageId", image._id))
      .collect(),
    ctx.db
      .query("comments")
      .withIndex("by_image", (q) => q.eq("imageId", image._id))
      .collect(),
    ctx.storage.getUrl(image.storageId),
  ]);
  return {
    _id: image._id,
    url,
    likeCount: likes.length,
    likedByMe: likes.some((like) => like.userId === me._id),
    commentCount: comments.length,
  };
}

async function enrichPost(
  ctx: QueryCtx,
  post: Doc<"posts">,
  me: Doc<"users">
) {
  const [uploader, images] = await Promise.all([
    ctx.db.get(post.userId),
    ctx.db
      .query("images")
      .withIndex("by_post", (q) => q.eq("postId", post._id))
      .collect(),
  ]);
  images.sort((a, b) => a.position - b.position);
  return {
    _id: post._id,
    name: post.name,
    createdAt: post._creationTime,
    uploaderName: uploader?.username ?? "Probably a yg stan",
    isMine: post.userId === me._id,
    images: await Promise.all(
      images.map((image) => enrichImage(ctx, image, me))
    ),
  };
}

export const listMine = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const user = await requireUser(ctx, token);
    const posts = await ctx.db
      .query("posts")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
    return await Promise.all(posts.map((post) => enrichPost(ctx, post, user)));
  },
});

export const listAll = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const user = await requireUser(ctx, token);
    const posts = await ctx.db.query("posts").order("desc").collect();
    return await Promise.all(posts.map((post) => enrichPost(ctx, post, user)));
  },
});

export const deletePost = mutation({
  args: { token: v.string(), postId: v.id("posts") },
  handler: async (ctx, { token, postId }) => {
    const user = await requireUser(ctx, token);
    const post = await ctx.db.get(postId);
    if (!post) return;
    if (post.userId !== user._id) {
      throw new Error("You can only delete your own posts");
    }

    const images = await ctx.db
      .query("images")
      .withIndex("by_post", (q) => q.eq("postId", postId))
      .collect();
    for (const image of images) {
      for (const table of ["likes", "comments", "notifications"] as const) {
        const rows = await ctx.db
          .query(table)
          .withIndex("by_image", (q) => q.eq("imageId", image._id))
          .collect();
        await Promise.all(rows.map((row) => ctx.db.delete(row._id)));
      }
      await ctx.storage.delete(image.storageId);
      await ctx.db.delete(image._id);
    }
    await ctx.db.delete(postId);
  },
});
