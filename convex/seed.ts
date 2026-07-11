import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { hashPassword, randomHex } from "./lib/auth";

/**
 * Seed (or update) attendee accounts. Run with:
 *   npx convex run seed:seedUsers '{"users": [{"regNo": "...", "username": "...", "password": "..."}]}'
 * or via scripts/seed.mjs which reads a CSV.
 */
export const seedUsers = internalMutation({
  args: {
    users: v.array(
      v.object({
        regNo: v.string(),
        username: v.string(),
        password: v.string(),
      })
    ),
  },
  handler: async (ctx, { users }) => {
    let created = 0;
    let updated = 0;
    for (const entry of users) {
      const regNo = entry.regNo.trim();
      const salt = randomHex(16);
      const passwordHash = await hashPassword(entry.password, salt);
      const existing = await ctx.db
        .query("users")
        .withIndex("by_regNo", (q) => q.eq("regNo", regNo))
        .unique();
      if (existing) {
        await ctx.db.patch(existing._id, {
          username: entry.username,
          passwordHash,
          salt,
        });
        updated++;
      } else {
        await ctx.db.insert("users", {
          regNo,
          username: entry.username,
          passwordHash,
          salt,
        });
        created++;
      }
    }
    return { created, updated };
  },
});
