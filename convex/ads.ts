import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const adTypeValidator = v.union(v.literal("image"), v.literal("video"));

const toPublicAd = (ad: {
  _id: unknown;
  adId: string;
  partner: string;
  headline: string;
  copy: string;
  image?: string;
  video?: string;
  link: string;
  isActive: boolean;
  type: "image" | "video";
  createdAt: number;
  clicks?: number;
}) => ({
  id: ad.adId,
  partner: ad.partner,
  headline: ad.headline,
  copy: ad.copy,
  image: ad.image,
  video: ad.video,
  link: ad.link,
  isActive: ad.isActive,
  type: ad.type,
  createdAt: ad.createdAt,
  clicks: ad.clicks ?? 0,
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const ads = await ctx.db.query("ads").withIndex("by_createdAt").order("desc").take(200);
    return ads.map(toPublicAd);
  },
});

export const upsert = mutation({
  args: {
    adId: v.string(),
    partner: v.string(),
    headline: v.string(),
    copy: v.string(),
    image: v.optional(v.string()),
    video: v.optional(v.string()),
    link: v.string(),
    isActive: v.boolean(),
    type: adTypeValidator,
    createdAt: v.number(),
    clicks: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("ads")
      .withIndex("by_adId", (q) => q.eq("adId", args.adId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, args);
      const next = await ctx.db.get(existing._id);
      return next ? toPublicAd(next) : null;
    }

    const id = await ctx.db.insert("ads", { ...args, clicks: args.clicks ?? 0 });
    const ad = await ctx.db.get(id);
    return ad ? toPublicAd(ad) : null;
  },
});

export const incrementClicks = mutation({
  args: {
    adId: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("ads")
      .withIndex("by_adId", (q) => q.eq("adId", args.adId))
      .unique();

    if (!existing) {
      return null;
    }

    const nextClicks = (existing.clicks ?? 0) + 1;
    await ctx.db.patch(existing._id, { clicks: nextClicks });
    return nextClicks;
  },
});
