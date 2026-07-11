import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    regNo: v.string(),
    username: v.string(),
    passwordHash: v.string(),
    salt: v.string(),
  }).index("by_regNo", ["regNo"]),

  sessions: defineTable({
    userId: v.id("users"),
    token: v.string(),
    expiresAt: v.number(),
  }).index("by_token", ["token"]),

  // A post is one upload action; its images are separate rows so each
  // photo carries its own likes and comments.
  posts: defineTable({
    userId: v.id("users"),
    name: v.string(),
  }).index("by_user", ["userId"]),

  images: defineTable({
    postId: v.id("posts"),
    storageId: v.id("_storage"),
    position: v.number(),
  }).index("by_post", ["postId"]),

  likes: defineTable({
    userId: v.id("users"),
    imageId: v.id("images"),
  })
    .index("by_image", ["imageId"])
    .index("by_image_user", ["imageId", "userId"]),

  comments: defineTable({
    userId: v.id("users"),
    text: v.string(),
    imageId: v.id("images"),
  }).index("by_image", ["imageId"]),

  // Game teams. Points live on the group and are adjusted by organizers
  // (games:adjustPoints via the dashboard/CLI), not by attendees.
  groups: defineTable({
    name: v.string(),
    points: v.number(),
    createdBy: v.id("users"),
  }).index("by_name", ["name"]),

  // One row per member; a user belongs to at most one group at a time.
  groupMembers: defineTable({
    groupId: v.id("groups"),
    userId: v.id("users"),
  })
    .index("by_group", ["groupId"])
    .index("by_user", ["userId"]),

  notifications: defineTable({
    userId: v.id("users"), // recipient (photo owner)
    actorId: v.id("users"), // who liked
    type: v.literal("like"),
    read: v.boolean(),
    imageId: v.id("images"),
  })
    .index("by_user", ["userId"])
    .index("by_user_read", ["userId", "read"])
    .index("by_image", ["imageId"]),
});
