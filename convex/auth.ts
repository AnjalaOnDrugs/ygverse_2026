import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  getUserByToken,
  hashPassword,
  randomHex,
  SESSION_DURATION_MS,
} from "./lib/auth";

export const login = mutation({
  args: { regNo: v.string(), password: v.string() },
  handler: async (ctx, { regNo, password }) => {
    const normalized = regNo.trim();
    const user = await ctx.db
      .query("users")
      .withIndex("by_regNo", (q) => q.eq("regNo", normalized))
      .unique();
    if (!user) {
      return { success: false as const, message: "Invalid credentials" };
    }

    const hash = await hashPassword(password, user.salt);
    if (hash !== user.passwordHash) {
      return { success: false as const, message: "Invalid credentials" };
    }

    const token = randomHex(32);
    await ctx.db.insert("sessions", {
      userId: user._id,
      token,
      expiresAt: Date.now() + SESSION_DURATION_MS,
    });

    return {
      success: true as const,
      token,
      username: user.username,
      regNo: user.regNo,
    };
  },
});

export const me = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const user = await getUserByToken(ctx, token);
    if (!user) return null;
    return { username: user.username, regNo: user.regNo };
  },
});

export const logout = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();
    if (session) await ctx.db.delete(session._id);
  },
});
