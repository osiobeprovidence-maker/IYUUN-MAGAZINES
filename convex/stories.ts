import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const storyStatusValidator = v.union(
  v.literal("draft"),
  v.literal("pending_review"),
  v.literal("published"),
  v.literal("changes_requested"),
);

const storyAspectValidator = v.union(
  v.literal("portrait"),
  v.literal("landscape"),
  v.literal("square"),
);

const storyTypeValidator = v.union(v.literal("image"), v.literal("video"));

const storyInputValidator = {
  storyId: v.string(),
  category: v.string(),
  title: v.string(),
  excerpt: v.string(),
  content: v.optional(v.string()),
  image: v.optional(v.string()),
  video: v.optional(v.string()),
  aspect: storyAspectValidator,
  type: storyTypeValidator,
  date: v.string(),
  ownerId: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.optional(v.number()),
  likesCount: v.optional(v.number()),
  status: storyStatusValidator,
  submittedAt: v.optional(v.number()),
  reviewedAt: v.optional(v.number()),
  reviewedBy: v.optional(v.string()),
  reviewNote: v.optional(v.string()),
};

const toPublicStory = (story: {
  _id: unknown;
  storyId: string;
  category: string;
  title: string;
  excerpt: string;
  content?: string;
  image?: string;
  video?: string;
  aspect: "portrait" | "landscape" | "square";
  type: "image" | "video";
  date: string;
  ownerId?: string;
  createdAt: number;
  updatedAt?: number;
  likesCount?: number;
  status: "draft" | "pending_review" | "published" | "changes_requested";
  submittedAt?: number;
  reviewedAt?: number;
  reviewedBy?: string;
  reviewNote?: string;
}) => ({
  id: story.storyId,
  category: story.category,
  title: story.title,
  excerpt: story.excerpt,
  content: story.content,
  image: story.image,
  video: story.video,
  aspect: story.aspect,
  type: story.type,
  date: story.date,
  ownerId: story.ownerId,
  createdAt: story.createdAt,
  updatedAt: story.updatedAt,
  likesCount: story.likesCount ?? 0,
  status: story.status,
  submittedAt: story.submittedAt,
  reviewedAt: story.reviewedAt,
  reviewedBy: story.reviewedBy,
  reviewNote: story.reviewNote,
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const stories = await ctx.db.query("stories").withIndex("by_createdAt").order("desc").take(200);
    return stories.map(toPublicStory);
  },
});

export const listPublished = query({
  args: {},
  handler: async (ctx) => {
    const stories = await ctx.db
      .query("stories")
      .withIndex("by_status_and_createdAt", (q) => q.eq("status", "published"))
      .order("desc")
      .take(200);

    return stories.map(toPublicStory);
  },
});

export const upsert = mutation({
  args: storyInputValidator,
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("stories")
      .withIndex("by_storyId", (q) => q.eq("storyId", args.storyId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, args);
      const next = await ctx.db.get(existing._id);
      return next ? toPublicStory(next) : null;
    }

    const id = await ctx.db.insert("stories", {
      ...args,
      likesCount: args.likesCount ?? 0,
    });

    const inserted = await ctx.db.get(id);
    return inserted ? toPublicStory(inserted) : null;
  },
});

export const remove = mutation({
  args: {
    storyId: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("stories")
      .withIndex("by_storyId", (q) => q.eq("storyId", args.storyId))
      .unique();

    if (!existing) {
      return null;
    }

    await ctx.db.delete(existing._id);
    return null;
  },
});

export const incrementLikes = mutation({
  args: {
    storyId: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("stories")
      .withIndex("by_storyId", (q) => q.eq("storyId", args.storyId))
      .unique();

    if (!existing) {
      throw new Error("Story not found.");
    }

    const nextLikes = (existing.likesCount ?? 0) + 1;
    await ctx.db.patch(existing._id, { likesCount: nextLikes });
    return nextLikes;
  },
});

export const seedInitialStories = mutation({
  args: {
    stories: v.array(v.object(storyInputValidator)),
  },
  handler: async (ctx, args) => {
    const inserted = [];

    for (const story of args.stories) {
      const existing = await ctx.db
        .query("stories")
        .withIndex("by_storyId", (q) => q.eq("storyId", story.storyId))
        .unique();

      if (existing) {
        continue;
      }

      const id = await ctx.db.insert("stories", {
        ...story,
        likesCount: story.likesCount ?? 0,
      });
      const insertedStory = await ctx.db.get(id);
      if (insertedStory) {
        inserted.push(toPublicStory(insertedStory));
      }
    }

    return inserted;
  },
});
