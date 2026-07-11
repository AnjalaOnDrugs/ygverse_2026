import { Doc } from "../_generated/dataModel";
import { QueryCtx } from "../_generated/server";

export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function randomHex(byteLength: number): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function hashPassword(
  password: string,
  salt: string
): Promise<string> {
  return sha256Hex(`${salt}:${password}`);
}

export const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * Resolves a session token to its user, or null if the session is
 * missing or expired. Shared by all modules (photos, and later
 * games/voting).
 */
export async function getUserByToken(
  ctx: QueryCtx,
  token: string
): Promise<Doc<"users"> | null> {
  const session = await ctx.db
    .query("sessions")
    .withIndex("by_token", (q) => q.eq("token", token))
    .unique();
  if (!session || session.expiresAt < Date.now()) return null;
  return await ctx.db.get(session.userId);
}

export async function requireUser(
  ctx: QueryCtx,
  token: string
): Promise<Doc<"users">> {
  const user = await getUserByToken(ctx, token);
  if (!user) throw new Error("Not logged in");
  return user;
}
