import { v } from "convex/values";
import { mutation } from "./_generated/server";

export const create = mutation({
  args: {
    email: v.string(),
    createdAt: v.number(),
  },
  handler: async (ctx, args) => {
    const normalizedEmail = args.email.trim().toLowerCase();
    const existing = await ctx.db
      .query("subscribers")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .unique();

    if (existing) {
      return { id: existing._id, email: existing.email, createdAt: existing.createdAt };
    }

    const id = await ctx.db.insert("subscribers", {
      email: normalizedEmail,
      createdAt: args.createdAt,
    });
    return { id, email: normalizedEmail, createdAt: args.createdAt };
  },
});
