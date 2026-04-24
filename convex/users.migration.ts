import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";

/**
 * Query to list all users in Convex (for admin review before/after migration).
 */
export const listAllUsers = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    return users.map((user) => ({
      _id: user._id,
      email: user.email,
      name: user.name,
      tokenIdentifier: user.tokenIdentifier,
      role: user.role,
      joined: user.joined,
      status: user.status,
      lastSeenAt: user.lastSeenAt,
    }));
  },
});

/**
 * Migration helper to backfill existing users into Convex.
 * 
 * This should be called manually (e.g., via Convex dashboard or CLI) 
 * after exporting Firebase user data and passing it as an argument.
 * 
 * Usage from browser console or script:
 * await convex.mutation(users.migrateExistingUsers, { 
 *   users: [
 *     { uid: "firebase_uid_1", email: "user1@example.com", displayName: "User One", photoURL: "..." },
 *     { uid: "firebase_uid_2", email: "user2@example.com", displayName: "User Two", photoURL: "..." },
 *   ] 
 * });
 */
export const migrateExistingUsers = internalMutation({
  args: {
    users: v.array(
      v.object({
        uid: v.string(),
        email: v.string(),
        displayName: v.optional(v.string()),
        photoURL: v.optional(v.string()),
        createdAt: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const SUPER_ADMIN_EMAIL = "riderezzy@gmail.com";
    const normalizeEmail = (email?: string | null) => email?.trim().toLowerCase() || "";
    const isSuperAdminEmail = (email?: string | null) => normalizeEmail(email) === SUPER_ADMIN_EMAIL;
    const defaultBio = "Architect of the new Pan-African visual language.";

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const firebaseUser of args.users) {
      const normalizedEmail = normalizeEmail(firebaseUser.email);
      if (!normalizedEmail) {
        console.warn(`Skipping user ${firebaseUser.uid}: no email`);
        skipped++;
        continue;
      }

      // Construct tokenIdentifier matching Convex's Firebase integration format
      // Convex expects: "https://securetoken.google.com/<project-id>:<uid>"
      const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || "gen-lang-client-0422761172";
      const tokenIdentifier = `https://securetoken.google.com/${projectId}:${firebaseUser.uid}`;

      // Check if user already exists by tokenIdentifier
      const existingByToken = await ctx.db
        .query("users")
        .withIndex("by_tokenIdentifier", (q) => q.eq("tokenIdentifier", tokenIdentifier))
        .unique();

      if (existingByToken) {
        // Already synced
        skipped++;
        continue;
      }

      // Check if user exists by email (maybe created via invite or previous partial sync)
      const existingByEmail = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
        .unique();

      const baseRole = isSuperAdminEmail(normalizedEmail) ? "admin" : "viewer";
      const baseEditorStatus = baseRole === "admin" ? "approved" : "none";
      const now = Date.now();

      if (existingByEmail) {
        // Link existing user record to Firebase UID
        await ctx.db.patch(existingByEmail._id, {
          tokenIdentifier,
          lastSeenAt: existingByEmail.lastSeenAt || firebaseUser.createdAt || now,
        });
        updated++;
      } else {
        // Create new user record
        await ctx.db.insert("users", {
          tokenIdentifier,
          email: normalizedEmail,
          name: firebaseUser.displayName || normalizedEmail.split("@")[0] || normalizedEmail,
          role: baseRole,
          joined: new Date(
            firebaseUser.createdAt || now
          ).toLocaleDateString("en-CA").replace(/-/g, "."),
          status: "active",
          editorStatus: baseEditorStatus,
          isPremium: baseRole === "admin",
          avatarUrl: firebaseUser.photoURL || undefined,
          bio: defaultBio,
          lastSeenAt: firebaseUser.createdAt || now,
        });
        created++;
      }
    }

    return { created, updated, skipped };
  },
});
