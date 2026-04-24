import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";

const SUPER_ADMIN_EMAIL = "riderezzy@gmail.com";
const defaultBio = "Architect of the new Pan-African visual language.";

const normalizeEmail = (email?: string | null) => email?.trim().toLowerCase() || "";
const isSuperAdminEmail = (email?: string | null) => normalizeEmail(email) === SUPER_ADMIN_EMAIL;

const toPublicUser = (user: Doc<"users">) => ({
  id: user._id,
  email: user.email,
  name: user.name,
  role: user.role,
  joined: user.joined,
  status: user.status,
  editorStatus: user.editorStatus,
  isPremium: user.isPremium,
  avatarUrl: user.avatarUrl,
  bio: user.bio ?? defaultBio,
  lastSeenAt: user.lastSeenAt,
});

async function getCurrentUserFromQuery(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Authentication required.");
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_tokenIdentifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .unique();

  if (!user) {
    throw new Error("User profile not found.");
  }

  return { identity, user };
}

async function getCurrentUserFromMutation(ctx: MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Authentication required.");
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_tokenIdentifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .unique();

  if (!user) {
    throw new Error("User profile not found.");
  }

  return { identity, user };
}

async function requireAdmin(ctx: QueryCtx | MutationCtx) {
  const authInfo =
    "runMutation" in ctx ? await getCurrentUserFromMutation(ctx) : await getCurrentUserFromQuery(ctx);
  if (authInfo.user.role !== "admin") {
    throw new Error("Admin access required.");
  }
  return authInfo;
}

export const me = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_tokenIdentifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    return user ? toPublicUser(user) : null;
  },
});

export const syncCurrentUser = mutation({
  args: {
    email: v.string(),
    name: v.string(),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required.");
    }

    // Use the email from the authenticated identity (Firebase ID token) as source of truth
    // Fall back to args.email only if identity.email is somehow missing
    const normalizedEmail = normalizeEmail(identity.email || args.email);
    if (!normalizedEmail) {
      throw new Error("User email is required.");
    }

    const now = Date.now();
    const existingByToken = await ctx.db
      .query("users")
      .withIndex("by_tokenIdentifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    const existingInvite = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .unique();

    const baseRole = isSuperAdminEmail(normalizedEmail) ? "admin" : "viewer";
    const baseEditorStatus = baseRole === "admin" ? "approved" : "none";

    if (existingByToken) {
      const nextRole = isSuperAdminEmail(normalizedEmail) ? "admin" : existingByToken.role;
      await ctx.db.patch(existingByToken._id, {
        email: normalizedEmail,
        name: args.name || identity.email?.split('@')[0] || existingByToken.name,
        avatarUrl: args.avatarUrl,
        role: nextRole,
        editorStatus: nextRole === "admin" ? "approved" : existingByToken.editorStatus,
        isPremium: isSuperAdminEmail(normalizedEmail) ? true : existingByToken.isPremium,
        status: existingByToken.status,
        lastSeenAt: now,
      });
      const next = await ctx.db.get(existingByToken._id);
      return next ? toPublicUser(next) : null;
    }

    if (existingInvite) {
      await ctx.db.patch(existingInvite._id, {
        tokenIdentifier: identity.tokenIdentifier,
        email: normalizedEmail,
        name: args.name || identity.email?.split('@')[0] || existingInvite.name,
        avatarUrl: args.avatarUrl,
        lastSeenAt: now,
      });
      const next = await ctx.db.get(existingInvite._id);
      return next ? toPublicUser(next) : null;
    }

    const id = await ctx.db.insert("users", {
      tokenIdentifier: identity.tokenIdentifier,
      email: normalizedEmail,
      name: args.name || identity.email?.split('@')[0] || normalizedEmail,
      role: baseRole,
      joined: new Date().toLocaleDateString("en-CA").replace(/-/g, "."),
      status: "active",
      editorStatus: baseEditorStatus,
      isPremium: baseRole === "admin",
      avatarUrl: args.avatarUrl,
      bio: defaultBio,
      lastSeenAt: now,
    });

    const user = await ctx.db.get(id);
    return user ? toPublicUser(user) : null;
  },
});

export const listTeam = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const users = await ctx.db.query("users").withIndex("by_role_and_joined").order("desc").take(200);
    return users.map(toPublicUser);
  },
});

export const inviteUser = mutation({
  args: {
    email: v.string(),
    role: v.union(v.literal("admin"), v.literal("editor"), v.literal("viewer")),
  },
  handler: async (ctx, args) => {
    const { identity } = await requireAdmin(ctx);
    const normalizedEmail = normalizeEmail(args.email);
    const inviterIsSuperAdmin = isSuperAdminEmail(identity.email);

    if (args.role === "admin" && !inviterIsSuperAdmin) {
      throw new Error("Only the super admin can assign admin role.");
    }

    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .unique();

    const payload = {
      email: normalizedEmail,
      name: normalizedEmail,
      role: args.role,
      joined: new Date().toLocaleDateString("en-CA").replace(/-/g, "."),
      status: "active" as const,
      editorStatus: args.role === "viewer" ? "none" as const : "approved" as const,
      isPremium: args.role === "admin",
      bio: defaultBio,
      lastSeenAt: Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, payload);
      const next = await ctx.db.get(existing._id);
      return next ? toPublicUser(next) : null;
    }

    const id = await ctx.db.insert("users", payload);
    const user = await ctx.db.get(id);
    return user ? toPublicUser(user) : null;
  },
});

export const updateUserRole = mutation({
  args: {
    userId: v.id("users"),
    role: v.union(v.literal("admin"), v.literal("editor"), v.literal("viewer")),
  },
  handler: async (ctx, args) => {
    const { identity } = await requireAdmin(ctx);
    if (args.role === "admin" && !isSuperAdminEmail(identity.email)) {
      throw new Error("Only the super admin can assign admin role.");
    }

    await ctx.db.patch(args.userId, {
      role: args.role,
      editorStatus: args.role === "viewer" ? "none" : "approved",
      isPremium: args.role === "admin",
    });
    const user = await ctx.db.get(args.userId);
    return user ? toPublicUser(user) : null;
  },
});

export const toggleUserBan = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found.");
    }
    const nextStatus = user.status === "banned" ? "active" : "banned";
    await ctx.db.patch(args.userId, { status: nextStatus });
    const next = await ctx.db.get(args.userId);
    return next ? toPublicUser(next) : null;
  },
});

export const removeUser = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const { identity } = await requireAdmin(ctx);
    if (!isSuperAdminEmail(identity.email)) {
      throw new Error("Only the super admin can remove users.");
    }
    await ctx.db.delete(args.userId);
    return null;
  },
});

export const updateProfile = mutation({
  args: {
    name: v.optional(v.string()),
    bio: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user } = await getCurrentUserFromMutation(ctx);
    await ctx.db.patch(user._id, {
      ...(args.name !== undefined ? { name: args.name } : {}),
      ...(args.bio !== undefined ? { bio: args.bio } : {}),
      ...(args.avatarUrl !== undefined ? { avatarUrl: args.avatarUrl } : {}),
      lastSeenAt: Date.now(),
    });
    const next = await ctx.db.get(user._id);
    return next ? toPublicUser(next) : null;
  },
});

export const requestEditorAccess = mutation({
  args: {},
  handler: async (ctx) => {
    const { user } = await getCurrentUserFromMutation(ctx);
    if (user.role === "admin" || user.role === "editor") {
      return toPublicUser(user);
    }
    await ctx.db.patch(user._id, { editorStatus: "pending", lastSeenAt: Date.now() });
    const next = await ctx.db.get(user._id);
    return next ? toPublicUser(next) : null;
  },
});

export const activatePremium = mutation({
  args: {},
  handler: async (ctx) => {
    const { user } = await getCurrentUserFromMutation(ctx);
    await ctx.db.patch(user._id, { isPremium: true, lastSeenAt: Date.now() });
    const next = await ctx.db.get(user._id);
    return next ? toPublicUser(next) : null;
  },
});
